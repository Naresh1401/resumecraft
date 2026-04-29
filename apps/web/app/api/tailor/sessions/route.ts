import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthedUser, unauthorized, badRequest, serverError, getClientIp, logApi, rateLimited,
} from "@/lib/auth/rbac";
import { CreateSessionSchema } from "@/lib/validators";
import { parseResumeBuffer, parseJDBuffer, detectKind } from "@/lib/files/parseResume";
import { uploadBuffer } from "@/lib/s3/s3Service";
import { tailorResume } from "@/lib/ai/aiService";
import { calculateATSScore, calculateOriginalAtsScore, boostKeywords } from "@/lib/ats/atsScorer";
import { polishStrings } from "@/lib/files/textPolish";
import { checkTailorRate, checkApiRate } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_BYTES = (Number(process.env.MAX_FILE_SIZE_MB) || 5) * 1024 * 1024;

// Best-effort extraction of role title and company from a job description so the
// user doesn't have to type them in. Falls back to nulls; AI tailoring still works.
function inferSessionMeta(jdText: string): { title: string | null; company: string | null } {
  const text = (jdText || "").replace(/\r/g, "").trim();
  if (!text) return { title: null, company: null };
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 25);

  const titleRegex = /\b((?:senior|sr\.?|junior|jr\.?|lead|principal|staff|chief)\s+)?(?:software|backend|frontend|full[\s-]?stack|data|ml|ai|machine\s+learning|devops|site\s+reliability|platform|cloud|security|mobile|ios|android|qa|test|product|project|program|technical|solutions?|systems?|network|database|business|marketing|sales|customer|support|hr|finance|operations|research|design|ux|ui)\s+(?:engineer|developer|scientist|analyst|architect|manager|consultant|specialist|administrator|designer|lead|director|officer|intern|associate)\b[a-z0-9 +/\-]*/i;
  const companyAtRegex = /\b(?:at|@|join|with|for)\s+([A-Z][A-Za-z0-9&.\- ]{1,40}?)(?:\s+(?:as|is|are|we|to|in|\.|,|\!|\?|$))/;
  const companyLabel = /^(?:company|employer|organi[sz]ation|about\s+us)\s*[:\-\u2013]\s*(.+)$/i;
  const titleLabel = /^(?:role|position|job\s*title|title)\s*[:\-\u2013]\s*(.+)$/i;

  let title: string | null = null;
  let company: string | null = null;

  for (const line of lines) {
    if (!title) {
      const m = line.match(titleLabel);
      if (m) title = m[1].trim();
    }
    if (!company) {
      const m = line.match(companyLabel);
      if (m) company = m[1].trim();
    }
    if (title && company) break;
  }
  if (!title) {
    const m = text.match(titleRegex);
    if (m) title = m[0].trim();
  }
  if (!company) {
    const m = text.match(companyAtRegex);
    if (m) company = m[1].trim();
  }

  const trim = (s: string | null) => (s ? s.replace(/[.,;:\-\u2013]+$/, "").slice(0, 120).trim() : null);
  return { title: trim(title), company: trim(company) };
}

// GET /api/tailor/sessions  → list
export async function GET(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return unauthorized();
  const ipRate = await checkApiRate(user.id);
  if (!ipRate.ok) return rateLimited();

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "10")));
  const search = (searchParams.get("search") || "").trim();
  const minScore = parseInt(searchParams.get("minScore") || "0");
  const maxScore = parseInt(searchParams.get("maxScore") || "100");

  const where: any = {
    userId: user.id,
    ...(search
      ? {
          OR: [
            { jdTitle: { contains: search, mode: "insensitive" } },
            { jdCompany: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.tailoringSession.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        versions: {
          where: { isCurrent: true },
          select: { id: true, atsScore: true, versionNumber: true },
          take: 1,
        },
        _count: { select: { versions: true, emails: true } },
      },
    }),
    prisma.tailoringSession.count({ where }),
  ]);

  // post-filter on score (current version)
  const filtered = items.filter((s) => {
    const score = s.versions[0]?.atsScore ?? 0;
    return score >= minScore && score <= maxScore;
  });

  return NextResponse.json({ items: filtered, total, page, pageSize });
}

// POST /api/tailor/sessions  → multipart/form-data: resume, jd OR jdText, name, jdTitle, jdCompany, outputFormat
export async function POST(req: NextRequest) {
  const start = Date.now();
  const user = await getAuthedUser(req);
  if (!user) return unauthorized();

  const rate = await checkTailorRate(user.id);
  if (!rate.ok) {
    await logApi({
      userId: user.id, endpoint: "/api/tailor/sessions", method: "POST",
      ip: getClientIp(req), apiKeyUsed: user.viaApiKey, status: 429, durationMs: Date.now() - start,
    });
    return rateLimited("Tailoring rate limit exceeded. Try again later.");
  }

  try {
    const form = await req.formData();
    const meta = {
      name: (form.get("name") as string) || null,
      jdTitle: (form.get("jdTitle") as string) || null,
      jdCompany: (form.get("jdCompany") as string) || null,
      jdText: String(form.get("jdText") || ""),
      userPrompt: (form.get("userPrompt") as string) || null,
      outputFormat: (String(form.get("outputFormat") || "DOCX").toUpperCase() as "DOCX" | "PDF"),
    };
    const resumeFile = form.get("resume") as File | null;
    const jdFile = form.get("jd") as File | null;

    if (!resumeFile) return badRequest("Resume file is required");
    if (resumeFile.size > MAX_BYTES) return badRequest("Resume file exceeds size limit");

    const resumeBuf = Buffer.from(await resumeFile.arrayBuffer());
    if (!detectKind(resumeBuf)) return badRequest("Resume must be a valid DOCX or PDF");

    let jdText = meta.jdText;
    if (jdFile && jdFile.size > 0) {
      if (jdFile.size > MAX_BYTES) return badRequest("JD file exceeds size limit");
      const jdBuf = Buffer.from(await jdFile.arrayBuffer());
      if (!detectKind(jdBuf)) return badRequest("JD file must be a valid DOCX or PDF");
      jdText = await parseJDBuffer(jdBuf);
    }

    const parsed = CreateSessionSchema.safeParse({ ...meta, jdText });
    if (!parsed.success) return badRequest("Invalid session data", parsed.error.flatten());

    // Derive sensible defaults so the user doesn't have to fill anything beyond resume + JD.
    const inferred = inferSessionMeta(parsed.data.jdText);
    const sessionName =
      (parsed.data.name && parsed.data.name.trim()) ||
      [inferred.company, inferred.title].filter(Boolean).join(" \u2014 ") ||
      `Tailored Resume \u2014 ${new Date().toISOString().slice(0, 10)}`;
    const jdTitle =
      (parsed.data.jdTitle && parsed.data.jdTitle.trim()) || inferred.title || "Tailored Role";
    const jdCompany = parsed.data.jdCompany?.trim() || inferred.company || null;

    // Parse resume
    const parsedResume = await parseResumeBuffer(resumeBuf);

    // ATS score of the ORIGINAL resume against the JD ("before" baseline).
    const originalAts = calculateOriginalAtsScore(parsedResume.text, parsed.data.jdText);

    // Upload original resume
    const upload = await uploadBuffer({
      prefix: `users/${user.id}/originals`,
      contentType: parsedResume.kind === "docx"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : "application/pdf",
      body: resumeBuf,
      filename: resumeFile.name,
    });

    // Create session in PROCESSING state
    const session = await prisma.tailoringSession.create({
      data: {
        userId: user.id,
        name: sessionName,
        jdTitle: jdTitle,
        jdCompany: jdCompany,
        jdText: parsed.data.jdText,
        originalResumeKey: upload.key,
        originalResumeUrl: upload.url,
        originalResumeText: parsedResume.text,
        styleMetadata: {
          ...(parsedResume.styleMetadata as any),
          originalAts: {
            total: originalAts.total,
            keywordMatch: originalAts.keywordMatch,
            sectionScore: originalAts.sectionScore,
            actionVerbScore: originalAts.actionVerbScore,
            formatScore: originalAts.formatScore,
            readabilityScore: originalAts.readabilityScore,
            matchedKeywords: originalAts.matchedKeywords.slice(0, 40),
            missingKeywords: originalAts.missingKeywords.slice(0, 40),
          },
        } as any,
        outputFormat: parsed.data.outputFormat,
        status: "PROCESSING",
      },
    });

    // Run AI tailoring (non-streaming for v1 creation; streaming endpoint exists separately)
    let tailored;
    try {
      tailored = await tailorResume({
        resumeText: parsedResume.text,
        jdText: parsed.data.jdText,
        userPrompt: parsed.data.userPrompt || undefined,
      });
    } catch (e: any) {
      await prisma.tailoringSession.update({
        where: { id: session.id },
        data: { status: "FAILED", errorMessage: e?.message?.slice(0, 500) || "AI failure" },
      });
      await logApi({
        userId: user.id, endpoint: "/api/tailor/sessions", method: "POST",
        ip: getClientIp(req), apiKeyUsed: user.viaApiKey, status: 500, durationMs: Date.now() - start,
      });
      return NextResponse.json(
        { error: "AI tailoring failed", code: "AI_FAILURE", sessionId: session.id },
        { status: 500 },
      );
    }

    // ATS scoring (authoritative server-side score; merge with model-claimed)
    // First, faithfully re-surface JD keywords that exist in the original resume
    // but were dropped by the model — this lifts keywordMatch without fabrication.
    tailored = boostKeywords(tailored, parsed.data.jdText, parsedResume.text);
    tailored = polishStrings(tailored); // strip Oxford commas, etc.
    const ats = calculateATSScore(tailored, parsed.data.jdText, parsedResume.text);

    const version = await prisma.resumeVersion.create({
      data: {
        sessionId: session.id,
        versionNumber: 1,
        tailoredJson: tailored as any,
        atsScore: ats.total,
        atsBreakdown: {
          keywordMatch: ats.keywordMatch,
          sectionScore: ats.sectionScore,
          actionVerbScore: ats.actionVerbScore,
          formatScore: ats.formatScore,
          readabilityScore: ats.readabilityScore,
        },
        changesMade: tailored.changesMade ?? [],
        matchedKeywords: ats.matchedKeywords,
        missingKeywords: ats.missingKeywords,
        isCurrent: true,
      },
    });

    await prisma.tailoringSession.update({
      where: { id: session.id },
      data: { status: "COMPLETED" },
    });

    await logApi({
      userId: user.id, endpoint: "/api/tailor/sessions", method: "POST",
      ip: getClientIp(req), apiKeyUsed: user.viaApiKey, status: 201, durationMs: Date.now() - start,
    });

    return NextResponse.json(
      {
        sessionId: session.id,
        versionId: version.id,
        atsScore: ats.total,
        originalAtsScore: originalAts.total,
        improvement: ats.total - originalAts.total,
        ats: {
          before: {
            total: originalAts.total,
            keywordMatch: originalAts.keywordMatch,
            sectionScore: originalAts.sectionScore,
            actionVerbScore: originalAts.actionVerbScore,
            formatScore: originalAts.formatScore,
            readabilityScore: originalAts.readabilityScore,
          },
          after: {
            total: ats.total,
            keywordMatch: ats.keywordMatch,
            sectionScore: ats.sectionScore,
            actionVerbScore: ats.actionVerbScore,
            formatScore: ats.formatScore,
            readabilityScore: ats.readabilityScore,
          },
        },
      },
      { status: 201 },
    );
  } catch (e: any) {
    return serverError(e?.message ?? "Failed to create session");
  }
}

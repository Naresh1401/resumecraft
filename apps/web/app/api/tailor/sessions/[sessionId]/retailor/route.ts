import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getAuthedUser, unauthorized, badRequest, notFound, forbidden,
  rateLimited, getClientIp, logApi,
} from "@/lib/auth/rbac";
import { RetailorSchema } from "@/lib/validators";
import { tailorResume } from "@/lib/ai/aiService";
import { calculateATSScore, boostKeywords } from "@/lib/ats/atsScorer";
import { polishStrings } from "@/lib/files/textPolish";
import { checkTailorRate } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest, { params }: { params: { sessionId: string } }) {
  const start = Date.now();
  const user = await getAuthedUser(req);
  if (!user) return unauthorized();

  const session = await prisma.tailoringSession.findUnique({
    where: { id: params.sessionId },
    include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
  });
  if (!session) return notFound("Session not found");
  if (session.userId !== user.id && user.role !== "ADMIN") return forbidden();

  const rate = await checkTailorRate(user.id);
  if (!rate.ok) return rateLimited("Tailoring rate limit exceeded.");

  const body = await req.json().catch(() => ({}));
  const parsed = RetailorSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid retailor payload", parsed.error.flatten());

  try {
    const tailored = polishStrings(
      boostKeywords(
        await tailorResume({
          resumeText: session.originalResumeText,
          jdText: session.jdText,
          edits: parsed.data.edits,
        }),
        session.jdText,
        session.originalResumeText,
      ),
    );
    const ats = calculateATSScore(tailored, session.jdText, session.originalResumeText);

    const next = (session.versions[0]?.versionNumber ?? 0) + 1;
    await prisma.resumeVersion.updateMany({
      where: { sessionId: session.id, isCurrent: true },
      data: { isCurrent: false },
    });
    const v = await prisma.resumeVersion.create({
      data: {
        sessionId: session.id,
        versionNumber: next,
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

    await logApi({
      userId: user.id, endpoint: `/api/tailor/sessions/${params.sessionId}/retailor`,
      method: "POST", ip: getClientIp(req), apiKeyUsed: user.viaApiKey, status: 201,
      durationMs: Date.now() - start,
    });
    return NextResponse.json({ versionId: v.id, versionNumber: v.versionNumber, atsScore: v.atsScore }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: "Re-tailor failed", code: "AI_FAILURE" }, { status: 500 });
  }
}

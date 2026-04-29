import { NextRequest, NextResponse } from "next/server";
import { tailorResume } from "@/lib/ai/aiService";
import { parseResumeBuffer } from "@/lib/files/parseResume";
import { calculateATSScore, calculateOriginalAtsScore } from "@/lib/ats/atsScorer";
import { generateDocx } from "@/lib/files/generateDocx";

export const runtime = "nodejs";
export const maxDuration = 120;

// Public, no-auth, no-DB endpoint.
// Inputs (multipart or JSON):
//   - resume: file (docx/pdf)  OR  resumeText: string
//   - jdText: string
//   - userPrompt?: string                (optional refinement instructions)
//   - previousTailored?: string|object   (optional - previous tailored JSON to refine)
// Output: { tailored, ats, atsDetail, docxBase64, docxFilename }
export async function POST(req: NextRequest) {
  try {
    const ct = req.headers.get("content-type") || "";
    let resumeText = "";
    let jdText = "";
    let userPrompt = "";
    let previousTailored: any = undefined;

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      jdText = String(form.get("jdText") || "").trim();
      userPrompt = String(form.get("userPrompt") || "").trim();
      const prev = String(form.get("previousTailored") || "").trim();
      if (prev) {
        try { previousTailored = JSON.parse(prev); } catch { /* ignore */ }
      }
      const direct = String(form.get("resumeText") || "").trim();
      if (direct) {
        resumeText = direct;
      } else {
        const file = form.get("resume");
        if (file && typeof file !== "string") {
          const buf = Buffer.from(await file.arrayBuffer());
          if (buf.length > 5 * 1024 * 1024) {
            return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });
          }
          const parsed = await parseResumeBuffer(buf);
          resumeText = parsed.text;
        }
      }
    } else {
      const body = await req.json().catch(() => ({}));
      resumeText = String(body.resumeText || "").trim();
      jdText = String(body.jdText || "").trim();
      userPrompt = String(body.userPrompt || "").trim();
      previousTailored = body.previousTailored;
    }

    if (resumeText.length < 50) {
      return NextResponse.json(
        { error: "Resume text too short (need at least 50 characters or upload a .docx/.pdf)" },
        { status: 400 }
      );
    }
    if (jdText.length < 20) {
      return NextResponse.json(
        { error: "Job description too short (need at least 20 characters)" },
        { status: 400 }
      );
    }

    const before = calculateOriginalAtsScore(resumeText, jdText);

    // First pass — honor userPrompt and use previousTailored as the editing baseline if provided
    let tailored = await tailorResume({
      resumeText,
      jdText,
      edits: previousTailored,
      userPrompt: userPrompt || undefined,
    });
    let after = calculateATSScore(tailored, jdText);

    // If ATS is below the 90-95 target, do up to 2 boost passes that explicitly push the score up
    // while still respecting userPrompt. Keep the highest-scoring result.
    let bestTailored = tailored;
    let bestAts = after;
    const TARGET = 90;
    const MAX_RETRIES = 2;
    for (let i = 0; i < MAX_RETRIES && bestAts.total < TARGET; i++) {
      const missing = (bestTailored as any).missingKeywords?.slice(0, 12) || [];
      const boostPrompt = [
        userPrompt,
        `BOOST PASS ${i + 1}: The previous tailored version scored ${bestAts.total}/100 on ATS. Push the score to 90-95 by:`,
        `- Surfacing every JD keyword the candidate truthfully has, especially: ${missing.join(", ") || "(see JD)"}.`,
        `- Ensuring EVERY experience bullet starts with a strong action verb in past tense.`,
        `- Adding at least one quantified outcome per role drawn from the original resume.`,
        `- Re-checking that all required ATS sections are present and well-formed.`,
        `Do NOT invent any new facts, companies, dates, metrics, or skills not present in the ORIGINAL RESUME.`,
      ].filter(Boolean).join("\n");

      const next = await tailorResume({
        resumeText,
        jdText,
        edits: bestTailored,
        userPrompt: boostPrompt,
      });
      const nextAts = calculateATSScore(next, jdText);
      if (nextAts.total > bestAts.total) {
        bestTailored = next;
        bestAts = nextAts;
      }
      if (bestAts.total >= TARGET) break;
    }
    tailored = bestTailored;
    after = bestAts;

    let docxBase64: string | null = null;
    try {
      const docx = await generateDocx(tailored);
      docxBase64 = docx.toString("base64");
    } catch {
      // docx is best-effort; the JSON is the source of truth
    }

    return NextResponse.json({
      tailored,
      ats: { before: before.total, after: after.total, improvement: after.total - before.total },
      atsDetail: { before, after },
      docxBase64,
      docxFilename: `tailored-resume-${Date.now()}.docx`,
    });
  } catch (err: any) {
    console.error("[quick-tailor] error:", err?.message || err);
    return NextResponse.json(
      { error: err?.message || "Failed to tailor resume" },
      { status: 500 }
    );
  }
}

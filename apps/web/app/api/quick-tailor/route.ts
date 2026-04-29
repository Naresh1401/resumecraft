import { NextRequest, NextResponse } from "next/server";
import { tailorResume } from "@/lib/ai/aiService";
import { parseResumeBuffer } from "@/lib/files/parseResume";
import { calculateATSScore, calculateOriginalAtsScore } from "@/lib/ats/atsScorer";
import { generateDocx } from "@/lib/files/generateDocx";

export const runtime = "nodejs";
export const maxDuration = 120;

// Public, no-auth, no-DB endpoint.
// Accepts either a resume file (docx/pdf) or raw resumeText, plus jdText.
// Returns tailored JSON, ATS scores, and the resulting .docx as base64.
export async function POST(req: NextRequest) {
  try {
    const ct = req.headers.get("content-type") || "";
    let resumeText = "";
    let jdText = "";

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      jdText = String(form.get("jdText") || "").trim();
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
    const tailored = await tailorResume({ resumeText, jdText });
    const after = calculateATSScore(tailored, jdText);

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

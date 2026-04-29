import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser, unauthorized, badRequest, notFound, forbidden } from "@/lib/auth/rbac";
import { UpdateVersionSchema } from "@/lib/validators";
import { calculateATSScore, boostKeywords } from "@/lib/ats/atsScorer";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: { versionId: string } }) {
  const user = await getAuthedUser(req);
  if (!user) return unauthorized();
  const v = await prisma.resumeVersion.findUnique({
    where: { id: params.versionId },
    include: { session: true },
  });
  if (!v) return notFound();
  if (v.session.userId !== user.id && user.role !== "ADMIN") return forbidden();

  const body = await req.json();
  const parsed = UpdateVersionSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid update", parsed.error.flatten());

  // Recalculate ATS for edited content
  // Re-surface JD keywords from the original resume that the user may have removed.
  const boosted = boostKeywords(parsed.data.tailoredJson, v.session.jdText, v.session.originalResumeText);
  const ats = calculateATSScore(boosted, v.session.jdText, v.session.originalResumeText);
  const updated = await prisma.resumeVersion.update({
    where: { id: params.versionId },
    data: {
      tailoredJson: boosted as any,
      atsScore: ats.total,
      atsBreakdown: {
        keywordMatch: ats.keywordMatch,
        sectionScore: ats.sectionScore,
        actionVerbScore: ats.actionVerbScore,
        formatScore: ats.formatScore,
        readabilityScore: ats.readabilityScore,
      },
      matchedKeywords: ats.matchedKeywords,
      missingKeywords: ats.missingKeywords,
    },
  });
  return NextResponse.json({ version: updated });
}

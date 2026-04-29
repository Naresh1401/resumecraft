import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser, unauthorized, badRequest, notFound, forbidden, serverError } from "@/lib/auth/rbac";
import { GenerateEmailSchema } from "@/lib/validators";
import { generateEmail } from "@/lib/ai/aiService";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return unauthorized();
  const body = await req.json();
  const parsed = GenerateEmailSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid payload", parsed.error.flatten());

  const version = await prisma.resumeVersion.findUnique({
    where: { id: parsed.data.versionId },
    include: { session: true },
  });
  if (!version || version.sessionId !== parsed.data.sessionId) return notFound();
  if (version.session.userId !== user.id && user.role !== "ADMIN") return forbidden();

  try {
    const result = await generateEmail({
      tailored: version.tailoredJson as any,
      jdText: version.session.jdText,
    });
    const email = await prisma.email.create({
      data: {
        sessionId: version.sessionId,
        versionId: version.id,
        subject: result.subject,
        body: result.body,
        wordCount: result.wordCount,
        status: "DRAFT",
      },
    });
    return NextResponse.json({ email }, { status: 201 });
  } catch (e: any) {
    return serverError(e?.message || "Email generation failed");
  }
}

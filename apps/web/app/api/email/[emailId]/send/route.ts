import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser, unauthorized, badRequest, notFound, forbidden, serverError } from "@/lib/auth/rbac";
import { SendEmailSchema } from "@/lib/validators";
import { sendEmail } from "@/lib/email/emailService";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: { emailId: string } }) {
  const user = await getAuthedUser(req);
  if (!user) return unauthorized();
  const e = await prisma.email.findUnique({
    where: { id: params.emailId },
    include: { session: true },
  });
  if (!e) return notFound();
  if (e.session.userId !== user.id && user.role !== "ADMIN") return forbidden();

  const body = await req.json();
  const parsed = SendEmailSchema.safeParse(body);
  if (!parsed.success) return badRequest("Recipient email is required", parsed.error.flatten());

  try {
    await sendEmail({ to: parsed.data.toEmail, subject: e.subject, body: e.body });
    const updated = await prisma.email.update({
      where: { id: e.id },
      data: { toEmail: parsed.data.toEmail, status: "SENT", sentAt: new Date(), errorMessage: null },
    });
    return NextResponse.json({ email: updated });
  } catch (err: any) {
    await prisma.email.update({
      where: { id: e.id },
      data: { status: "FAILED", errorMessage: err?.message?.slice(0, 500) || "send failed" },
    });
    return serverError("Failed to send email");
  }
}

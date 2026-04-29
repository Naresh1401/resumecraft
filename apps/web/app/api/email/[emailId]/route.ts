import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser, unauthorized, badRequest, notFound, forbidden, serverError } from "@/lib/auth/rbac";
import { UpdateEmailSchema, SendEmailSchema } from "@/lib/validators";
import { sendEmail } from "@/lib/email/emailService";

export const runtime = "nodejs";

async function loadEmail(emailId: string, userId: string, role: "USER" | "ADMIN") {
  const e = await prisma.email.findUnique({
    where: { id: emailId },
    include: { session: true },
  });
  if (!e) return { err: notFound() } as const;
  if (e.session.userId !== userId && role !== "ADMIN") return { err: forbidden() } as const;
  return { email: e } as const;
}

export async function PUT(req: NextRequest, { params }: { params: { emailId: string } }) {
  const user = await getAuthedUser(req);
  if (!user) return unauthorized();
  const r = await loadEmail(params.emailId, user.id, user.role);
  if ("err" in r) return r.err;
  const body = await req.json();
  const parsed = UpdateEmailSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid update", parsed.error.flatten());
  const wc = parsed.data.body
    ? parsed.data.body.trim().split(/\s+/).filter(Boolean).length
    : undefined;
  const updated = await prisma.email.update({
    where: { id: params.emailId },
    data: {
      ...(parsed.data.toEmail !== undefined ? { toEmail: parsed.data.toEmail } : {}),
      ...(parsed.data.subject !== undefined ? { subject: parsed.data.subject } : {}),
      ...(parsed.data.body !== undefined ? { body: parsed.data.body, wordCount: wc ?? 0 } : {}),
    },
  });
  return NextResponse.json({ email: updated });
}

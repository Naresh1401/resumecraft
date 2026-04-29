import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser, unauthorized, badRequest, notFound, forbidden } from "@/lib/auth/rbac";
import { UpdateSessionSchema } from "@/lib/validators";
import { deleteObject } from "@/lib/s3/s3Service";

export const runtime = "nodejs";

async function ensureOwn(sessionId: string, userId: string, role: "USER" | "ADMIN") {
  const s = await prisma.tailoringSession.findUnique({ where: { id: sessionId } });
  if (!s) return { err: notFound("Session not found") } as const;
  if (s.userId !== userId && role !== "ADMIN") return { err: forbidden() } as const;
  return { session: s } as const;
}

export async function GET(req: NextRequest, { params }: { params: { sessionId: string } }) {
  const user = await getAuthedUser(req);
  if (!user) return unauthorized();
  const r = await ensureOwn(params.sessionId, user.id, user.role);
  if ("err" in r) return r.err;

  const session = await prisma.tailoringSession.findUnique({
    where: { id: params.sessionId },
    include: {
      versions: { orderBy: { versionNumber: "asc" } },
      emails: { orderBy: { createdAt: "desc" } },
    },
  });
  return NextResponse.json({ session });
}

export async function PUT(req: NextRequest, { params }: { params: { sessionId: string } }) {
  const user = await getAuthedUser(req);
  if (!user) return unauthorized();
  const r = await ensureOwn(params.sessionId, user.id, user.role);
  if ("err" in r) return r.err;

  const body = await req.json();
  const parsed = UpdateSessionSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid update", parsed.error.flatten());

  const updated = await prisma.tailoringSession.update({
    where: { id: params.sessionId },
    data: { name: parsed.data.name },
  });
  return NextResponse.json({ session: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { sessionId: string } }) {
  const user = await getAuthedUser(req);
  if (!user) return unauthorized();
  const r = await ensureOwn(params.sessionId, user.id, user.role);
  if ("err" in r) return r.err;

  const versions = await prisma.resumeVersion.findMany({
    where: { sessionId: params.sessionId },
    select: { fileKey: true },
  });
  const session = r.session;

  await prisma.tailoringSession.delete({ where: { id: params.sessionId } });

  // best-effort S3 cleanup
  await Promise.allSettled([
    deleteObject(session.originalResumeKey),
    ...versions.filter((v) => v.fileKey).map((v) => deleteObject(v.fileKey!)),
  ]);

  return NextResponse.json({ ok: true });
}

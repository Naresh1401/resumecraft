import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser, unauthorized, forbidden, getClientIp } from "@/lib/auth/rbac";
import { deleteObject } from "@/lib/s3/s3Service";

export const runtime = "nodejs";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  const sessions = await prisma.tailoringSession.findMany({
    where: { userId: params.id },
    include: { versions: { select: { fileKey: true } } },
  });

  await prisma.tailoringSession.deleteMany({ where: { userId: params.id } });

  await Promise.allSettled(
    sessions.flatMap((s) => [
      deleteObject(s.originalResumeKey),
      ...s.versions.filter((v) => v.fileKey).map((v) => deleteObject(v.fileKey!)),
    ]),
  );

  await prisma.auditLog.create({
    data: {
      adminId: user.id,
      targetUserId: params.id,
      action: "RESET_HISTORY",
      metadata: { sessionsDeleted: sessions.length },
      ipAddress: getClientIp(req),
    },
  });
  return NextResponse.json({ ok: true, deleted: sessions.length });
}

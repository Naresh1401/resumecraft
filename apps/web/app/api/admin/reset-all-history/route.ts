import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser, unauthorized, forbidden, badRequest, getClientIp } from "@/lib/auth/rbac";
import { ResetAllSchema } from "@/lib/validators";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  const body = await req.json().catch(() => ({}));
  const parsed = ResetAllSchema.safeParse(body);
  if (!parsed.success) return badRequest('Confirmation must equal "CONFIRM DELETE ALL"');

  const total = await prisma.tailoringSession.count();
  await prisma.tailoringSession.deleteMany({});
  await prisma.auditLog.create({
    data: {
      adminId: user.id,
      action: "RESET_ALL_HISTORY",
      metadata: { sessionsDeleted: total },
      ipAddress: getClientIp(req),
    },
  });
  return NextResponse.json({ ok: true, deleted: total });
}

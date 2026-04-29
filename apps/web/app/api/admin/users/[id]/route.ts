import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser, unauthorized, forbidden, badRequest, getClientIp } from "@/lib/auth/rbac";
import { AdminUserActionSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();
  const body = await req.json();
  const parsed = AdminUserActionSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid action", parsed.error.flatten());

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: {
      ...(parsed.data.role ? { role: parsed.data.role } : {}),
      ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
    },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  await prisma.auditLog.create({
    data: {
      adminId: user.id,
      targetUserId: params.id,
      action: parsed.data.role
        ? `ROLE_CHANGE:${parsed.data.role}`
        : `STATUS_CHANGE:${parsed.data.isActive}`,
      metadata: parsed.data as any,
      ipAddress: getClientIp(req),
    },
  });
  return NextResponse.json({ user: updated });
}

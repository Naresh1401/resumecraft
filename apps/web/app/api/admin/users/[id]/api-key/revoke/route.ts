import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateApiKey, getAuthedUser, unauthorized, forbidden, getClientIp } from "@/lib/auth/rbac";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();
  const k = generateApiKey();
  await prisma.user.update({
    where: { id: params.id },
    data: { apiKeyHash: k.hash, apiKeyPrefix: k.prefix, apiKeyCreatedAt: new Date() },
  });
  await prisma.auditLog.create({
    data: {
      adminId: user.id, targetUserId: params.id, action: "REVOKE_API_KEY",
      ipAddress: getClientIp(req),
    },
  });
  // Admin doesn't see user's new key. User must regenerate from profile to view.
  return NextResponse.json({ ok: true });
}

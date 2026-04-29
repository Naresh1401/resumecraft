import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser, unauthorized } from "@/lib/auth/rbac";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return unauthorized();
  const u = await prisma.user.findUnique({
    where: { id: user.id },
    select: { apiKeyPrefix: true, apiKeyCreatedAt: true },
  });
  return NextResponse.json({
    masked: `${u?.apiKeyPrefix ?? ""}••••••••••••••••••••••••`,
    createdAt: u?.apiKeyCreatedAt,
  });
}

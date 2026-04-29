import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateApiKey, getAuthedUser, unauthorized } from "@/lib/auth/rbac";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return unauthorized();
  const k = generateApiKey();
  await prisma.user.update({
    where: { id: user.id },
    data: { apiKeyHash: k.hash, apiKeyPrefix: k.prefix, apiKeyCreatedAt: new Date() },
  });
  return NextResponse.json({
    apiKey: k.raw,
    masked: `${k.prefix}••••••••••••••••••••••••`,
    message: "Save this key — it won't be shown again.",
  });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser, unauthorized, forbidden, badRequest, getClientIp } from "@/lib/auth/rbac";
import { SystemSettingsSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();
  const settings = await prisma.systemSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
  return NextResponse.json({ settings });
}

export async function PUT(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();
  const body = await req.json();
  const parsed = SystemSettingsSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid settings", parsed.error.flatten());
  const settings = await prisma.systemSettings.upsert({
    where: { id: "singleton" },
    update: parsed.data as any,
    create: { id: "singleton", ...(parsed.data as any) },
  });
  await prisma.auditLog.create({
    data: { adminId: user.id, action: "UPDATE_SETTINGS", metadata: parsed.data as any, ipAddress: getClientIp(req) },
  });
  return NextResponse.json({ settings });
}

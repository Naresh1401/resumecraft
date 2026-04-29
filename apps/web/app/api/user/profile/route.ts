import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getAuthedUser, unauthorized, badRequest, serverError } from "@/lib/auth/rbac";
import { UpdateProfileSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return unauthorized();
  const u = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true, name: true, email: true, role: true, createdAt: true, lastLogin: true,
      apiKeyPrefix: true, apiKeyCreatedAt: true,
      _count: { select: { sessions: true, apiLogs: true } },
    },
  });
  return NextResponse.json({ user: u });
}

export async function PUT(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return unauthorized();
  try {
    const body = await req.json();
    const parsed = UpdateProfileSchema.safeParse(body);
    if (!parsed.success) return badRequest("Invalid profile data", parsed.error.flatten());

    const data: any = {};
    if (parsed.data.name) data.name = parsed.data.name;
    if (parsed.data.email) data.email = parsed.data.email;

    if (parsed.data.newPassword) {
      if (!parsed.data.currentPassword)
        return badRequest("Current password is required to set a new password");
      const existing = await prisma.user.findUnique({ where: { id: user.id } });
      if (!existing) return unauthorized();
      const ok = await bcrypt.compare(parsed.data.currentPassword, existing.passwordHash);
      if (!ok) return badRequest("Current password is incorrect");
      data.passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
      select: { id: true, name: true, email: true, role: true },
    });
    return NextResponse.json({ user: updated });
  } catch (e: any) {
    if (e?.code === "P2002") return badRequest("Email already in use");
    return serverError();
  }
}

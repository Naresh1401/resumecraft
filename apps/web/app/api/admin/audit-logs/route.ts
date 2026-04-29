import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser, unauthorized, forbidden } from "@/lib/auth/rbac";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "25")));
  const action = searchParams.get("action") || undefined;
  const adminId = searchParams.get("adminId") || undefined;

  const where = {
    ...(action ? { action: { contains: action, mode: "insensitive" as const } } : {}),
    ...(adminId ? { adminId } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        admin: { select: { name: true, email: true } },
        targetUser: { select: { name: true, email: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, pageSize });
}

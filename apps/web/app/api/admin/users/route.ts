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
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20")));
  const search = (searchParams.get("search") || "").trim();
  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, name: true, email: true, role: true, isActive: true,
        apiKeyPrefix: true, lastLogin: true, createdAt: true,
        _count: { select: { sessions: true, apiLogs: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ items, total, page, pageSize });
}

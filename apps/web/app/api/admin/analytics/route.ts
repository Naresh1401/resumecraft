import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser, unauthorized, forbidden } from "@/lib/auth/rbac";
import { topKeywords } from "@/lib/ats/atsScorer";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getAuthedUser(req);
  if (!user) return unauthorized();
  if (user.role !== "ADMIN") return forbidden();

  const [users, sessions, emails, apiCalls] = await Promise.all([
    prisma.user.count(),
    prisma.tailoringSession.count(),
    prisma.email.count(),
    prisma.apiLog.count(),
  ]);

  // Daily usage last 14 days
  const since = new Date();
  since.setDate(since.getDate() - 13);
  since.setHours(0, 0, 0, 0);

  const apiByDay = await prisma.apiLog.groupBy({
    by: ["createdAt"],
    where: { createdAt: { gte: since } },
    _count: { _all: true },
  });
  const sessionsByDay = await prisma.tailoringSession.groupBy({
    by: ["createdAt"],
    where: { createdAt: { gte: since } },
    _count: { _all: true },
  });

  function bucket(rows: { createdAt: Date; _count: { _all: number } }[]) {
    const m = new Map<string, number>();
    for (let i = 0; i < 14; i++) {
      const d = new Date(since); d.setDate(since.getDate() + i);
      m.set(d.toISOString().slice(0, 10), 0);
    }
    for (const r of rows) {
      const k = new Date(r.createdAt).toISOString().slice(0, 10);
      m.set(k, (m.get(k) ?? 0) + r._count._all);
    }
    return [...m.entries()].map(([date, count]) => ({ date, count }));
  }

  // Top JD keywords across all sessions (limit to recent 200)
  const jds = await prisma.tailoringSession.findMany({
    select: { jdText: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const allText = jds.map((j) => j.jdText).join(" ");
  const top = topKeywords(allText, 10);

  return NextResponse.json({
    totals: { users, sessions, emails, apiCalls },
    apiByDay: bucket(apiByDay as any),
    sessionsByDay: bucket(sessionsByDay as any),
    topKeywords: top,
  });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser, unauthorized, notFound, forbidden } from "@/lib/auth/rbac";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { sessionId: string } }) {
  const user = await getAuthedUser(req);
  if (!user) return unauthorized();
  const s = await prisma.tailoringSession.findUnique({ where: { id: params.sessionId } });
  if (!s) return notFound();
  if (s.userId !== user.id && user.role !== "ADMIN") return forbidden();
  const versions = await prisma.resumeVersion.findMany({
    where: { sessionId: params.sessionId },
    orderBy: { versionNumber: "asc" },
  });
  return NextResponse.json({ versions });
}

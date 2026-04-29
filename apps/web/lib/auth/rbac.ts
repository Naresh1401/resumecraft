import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth/authOptions";

export type AuthedUser = {
  id: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
  viaApiKey: boolean;
};

export function hashApiKey(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

export function generateApiKey() {
  const raw = `rt_${randomUUID().replace(/-/g, "")}`;
  return { raw, hash: hashApiKey(raw), prefix: raw.slice(0, 8) };
}

export async function getAuthedUser(req: NextRequest): Promise<AuthedUser | null> {
  // 1) Bearer API key
  const authz = req.headers.get("authorization") ?? "";
  if (authz.toLowerCase().startsWith("bearer ")) {
    const raw = authz.slice(7).trim();
    if (raw.startsWith("rt_")) {
      const hash = hashApiKey(raw);
      const user = await prisma.user.findUnique({ where: { apiKeyHash: hash } });
      if (user && user.isActive) {
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          viaApiKey: true,
        };
      }
    }
  }

  // 2) NextAuth session
  const session = await auth();
  if (session?.user?.id) {
    return {
      id: session.user.id,
      email: session.user.email ?? "",
      name: session.user.name ?? "",
      role: session.user.role,
      viaApiKey: false,
    };
  }
  return null;
}

export function unauthorized(msg = "Unauthorized") {
  return NextResponse.json({ error: msg, code: "UNAUTHORIZED" }, { status: 401 });
}

export function forbidden(msg = "Forbidden") {
  return NextResponse.json({ error: msg, code: "FORBIDDEN" }, { status: 403 });
}

export function badRequest(msg: string, details?: unknown) {
  return NextResponse.json({ error: msg, code: "BAD_REQUEST", details }, { status: 400 });
}

export function serverError(msg = "Internal server error") {
  return NextResponse.json({ error: msg, code: "INTERNAL_ERROR" }, { status: 500 });
}

export function notFound(msg = "Not found") {
  return NextResponse.json({ error: msg, code: "NOT_FOUND" }, { status: 404 });
}

export function rateLimited(msg = "Too many requests") {
  return NextResponse.json({ error: msg, code: "RATE_LIMITED" }, { status: 429 });
}

export async function logApi(opts: {
  userId: string;
  endpoint: string;
  method: string;
  ip: string;
  apiKeyUsed: boolean;
  status: number;
  durationMs?: number;
}) {
  try {
    await prisma.apiLog.create({
      data: {
        userId: opts.userId,
        endpoint: opts.endpoint,
        method: opts.method,
        ipAddress: opts.ip,
        apiKeyUsed: opts.apiKeyUsed,
        responseStatus: opts.status,
        durationMs: opts.durationMs ?? 0,
      },
    });
  } catch {
    /* swallow */
  }
}

export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

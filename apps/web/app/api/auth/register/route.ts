import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { RegisterSchema } from "@/lib/validators";
import { generateApiKey } from "@/lib/auth/rbac";
import { withSecurityHeaders } from "@/lib/security";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return withSecurityHeaders(
        NextResponse.json(
          { error: "Invalid registration data", code: "BAD_REQUEST", details: parsed.error.flatten() },
          { status: 400 },
        ),
      );
    }
    const { name, email, password } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return withSecurityHeaders(
        NextResponse.json({ error: "Email already in use", code: "EMAIL_EXISTS" }, { status: 409 }),
      );
    }
    const apiKey = generateApiKey();
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: await bcrypt.hash(password, 12),
        apiKeyHash: apiKey.hash,
        apiKeyPrefix: apiKey.prefix,
      },
      select: { id: true, name: true, email: true, role: true },
    });
    return withSecurityHeaders(
      NextResponse.json(
        { user, apiKey: apiKey.raw, message: "Save this API key — it won't be shown again." },
        { status: 201 },
      ),
    );
  } catch (e) {
    return NextResponse.json({ error: "Registration failed", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getObject } from "@/lib/s3/s3Service";
import { getAuthedUser, unauthorized } from "@/lib/auth/rbac";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { key: string } }) {
  const user = await getAuthedUser(req);
  if (!user) return unauthorized();
  try {
    const buf = await getObject(decodeURIComponent(params.key));
    const url = new URL(req.url);
    const filename = url.searchParams.get("filename") || "file";
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
  }
}

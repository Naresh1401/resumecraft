import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/authOptions";

const SHOWCASE_MODE = process.env.NEXT_PUBLIC_SHOWCASE_MODE === "true";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Showcase mode: hide login/signup and any DB-backed pages — send everyone to landing
  if (SHOWCASE_MODE) {
    if (
      pathname.startsWith("/login") ||
      pathname.startsWith("/register") ||
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/tailor") ||
      pathname.startsWith("/profile") ||
      pathname.startsWith("/admin")
    ) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    // Block API routes that need DB so users don't see 500s.
    // Allow /api/quick-tailor (no DB, no auth — the public input/output endpoint).
    if (
      pathname.startsWith("/api/auth/register") ||
      pathname.startsWith("/api/tailor") ||
      pathname.startsWith("/api/admin") ||
      pathname.startsWith("/api/user") ||
      pathname.startsWith("/api/email") ||
      pathname.startsWith("/api/versions") ||
      pathname.startsWith("/api/files")
    ) {
      return NextResponse.json(
        { error: "This is a public showcase. Run the project locally to use the full app.", repo: "https://github.com/Naresh1401/resumecraft" },
        { status: 503 }
      );
    }
    return NextResponse.next();
  }

  // CORS allowlist for cross-origin (programmatic) callers
  const origin = req.headers.get("origin");
  const allowed = process.env.NEXT_PUBLIC_APP_URL;
  if (origin && allowed && origin !== allowed && pathname.startsWith("/api/")) {
    // allow same-host browser requests; block other cross-origin
    return new NextResponse(null, { status: 403 });
  }

  const session = await auth();

  if (pathname.startsWith("/admin")) {
    if (!session?.user) return NextResponse.redirect(new URL("/login", req.url));
    if (session.user.role !== "ADMIN")
      return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (
    (pathname.startsWith("/dashboard") ||
      pathname.startsWith("/tailor") ||
      pathname.startsWith("/profile")) &&
    !session?.user
  ) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/register",
    "/admin/:path*",
    "/dashboard/:path*",
    "/tailor/:path*",
    "/profile/:path*",
    "/api/:path*",
  ],
};

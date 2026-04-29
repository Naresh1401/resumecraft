import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth/authOptions";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

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
  matcher: ["/admin/:path*", "/dashboard/:path*", "/tailor/:path*", "/profile/:path*", "/api/:path*"],
};

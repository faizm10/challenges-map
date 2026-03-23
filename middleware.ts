import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { isPublicComingSoon } from "@/lib/public-site-mode";

export function middleware(request: NextRequest) {
  if (!isPublicComingSoon()) {
    return NextResponse.next();
  }
  const path = request.nextUrl.pathname;
  if (path === "/" || path === "/leaderboard" || path === "/map") {
    return NextResponse.rewrite(new URL("/coming-soon", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/leaderboard", "/map"],
};

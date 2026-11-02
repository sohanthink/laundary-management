import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: is there a session cookie at all?
// Real permission checks happen in server/auth/dal.ts on every page and action.
export function proxy(request: NextRequest) {
  if (!request.cookies.has("session")) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/portal/:path*", "/change-password"],
};

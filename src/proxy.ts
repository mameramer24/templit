/**
 * Next.js Middleware — auth guard
 *
 * In Auth.js v5, the `auth` export from `next-auth` can be used directly
 * as middleware. It will check for a valid session on every request.
 *
 * Public routes (no session required):
 *  /login, /api/auth/**, /
 *
 * Protected routes (redirect to /login if no session):
 *  everything else
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/api/auth",
  "/_next",
  "/favicon.ico",
  "/sw.js",
  "/manifest.json",
];

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isPublic = PUBLIC_PATHS.some((path) =>
    nextUrl.pathname.startsWith(path)
  );

  if (!isPublic && !session) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  // Apply to all routes except static files
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf|eot)$).*)"],
};

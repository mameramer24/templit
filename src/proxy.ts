/**
 * Next.js Proxy (replaces deprecated middleware.ts in Next.js 16)
 *
 * Responsibilities:
 *  1. Redirect unauthenticated users to /login
 *  2. Restrict /admin/** routes to superadmin users only
 *
 * Public routes (no session required):
 *  /login, /register, /api/auth/**, /
 *
 * Super-admin-only routes:
 *  /admin/**
 */

import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/api/auth",
  "/_next",
  "/favicon.ico",
  "/sw.js",
  "/manifest.json",
];

const SUPERADMIN_PATHS = ["/admin"];

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;

  const isPublic = PUBLIC_PATHS.some((p) => nextUrl.pathname.startsWith(p));
  const isSuperAdminRoute = SUPERADMIN_PATHS.some((p) =>
    nextUrl.pathname.startsWith(p)
  );

  // 1. Unauthenticated → send to /login
  if (!isPublic && !session) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Super-admin-only routes
  if (isSuperAdminRoute) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const role = (session?.user as any)?.role as string | undefined;
    if (role !== "superadmin") {
      // Non-superadmins get a 403 page
      return NextResponse.redirect(new URL("/403", nextUrl.origin));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf|eot)$).*)",
  ],
};

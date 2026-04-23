/**
 * Next.js Proxy (replaces deprecated middleware.ts in Next.js 16)
 *
 * Responsibilities:
 *  1. Add CORS headers to /trigger and /api/** routes
 *  2. Handle OPTIONS preflight requests
 *  3. Redirect unauthenticated users to /login
 *  4. Restrict /admin/** routes to superadmin users only
 *
 * Public routes (no session required):
 *  /login, /register, /api/auth/**, /trigger, /
 *
 * Super-admin-only routes:
 *  /admin/**
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
  "/trigger",   // Public API endpoint for n8n/webhooks
  "/api/v1",    // Public API routes (auth handled internally)
];

const SUPERADMIN_PATHS = ["/admin"];

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-Key, Authorization",
  "Access-Control-Max-Age": "86400",
};

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;

  // ── CORS: Handle OPTIONS preflight for API and trigger routes ────────────
  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
  }

  // ── CORS: Add headers to /trigger and /api/** responses ─────────────────
  if (
    nextUrl.pathname.startsWith("/trigger") ||
    nextUrl.pathname.startsWith("/api/v1")
  ) {
    const response = NextResponse.next();
    Object.entries(CORS_HEADERS).forEach(([k, v]) => response.headers.set(k, v));
    return response;
  }

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

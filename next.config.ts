import type { NextConfig } from "next";

/**
 * Next.js 16 configuration for the Templit platform.
 *
 * Key requirements:
 *  1. SharedArrayBuffer headers (COOP + COEP) — required by FFmpeg.wasm
 *  2. WebAssembly support — Turbopack handles WASM natively in Next.js 16
 *  3. Serwist PWA wrapper (production only)
 */

const nextConfig: NextConfig = {
  // ── Strict mode ───────────────────────────────────────────────────────────
  reactStrictMode: true,

  // ── Turbopack config (Next.js 16 default bundler) ────────────────────────
  // Empty object = enable Turbopack with defaults (satisfies the CLI flag check)
  // Turbopack supports WASM natively; no special config needed for @ffmpeg/ffmpeg.
  turbopack: {},

  // ── SharedArrayBuffer headers required by FFmpeg.wasm ────────────────────
  // These MUST be set on every response; otherwise Atomics.wait() is disabled
  // and @ffmpeg/ffmpeg will throw at runtime.
  async headers() {
    return [
      {
        // Only apply COEP/COOP to page routes, NOT to API routes
        // These headers on API routes block external POST requests (e.g. from n8n)
        source: "/((?!api/).*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
        ],
      },
      {
        // For API routes: allow cross-origin requests
        source: "/api/(.*)",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, X-API-Key, Authorization",
          },
        ],
      },
      {
        // Also allow CORS for the /trigger route
        source: "/trigger",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, X-API-Key, Authorization",
          },
        ],
      },
    ];
  },

  // ── Image remote patterns (Vercel Blob CDN) ───────────────────────────────
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "**.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default nextConfig;

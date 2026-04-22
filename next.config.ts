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
        source: "/(.*)",
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

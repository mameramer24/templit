import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// ── Fonts ─────────────────────────────────────────────────────────────────────

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

// ── Site metadata ─────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: {
    default: "Templit — Template Rendering Platform",
    template: "%s | Templit",
  },
  description:
    "Create, edit, and render stunning image and video templates with a browser-based canvas editor and client-side MP4 rendering powered by FFmpeg.wasm.",
  applicationName: "Templit",
  keywords: ["template", "rendering", "video", "image", "canvas", "ffmpeg", "design"],
  authors: [{ name: "Templit Team" }],
  robots: { index: false, follow: false }, // private SaaS — no SEO indexing
  icons: {
    icon: "/favicon.ico",
  },
  // PWA manifest
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0f0f1a",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

// ── Root layout ───────────────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@200..1000&family=Montserrat:ital,wght@0,100..900;1,100..900&family=Oswald:wght@200..700&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col font-[var(--font-inter)] bg-[#0f0f1a]">
        {children}
        <Toaster richColors position="bottom-right" />
      </body>
    </html>
  );
}

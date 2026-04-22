"use client";

/**
 * CanvasEditorLoader — thin client wrapper for dynamically importing CanvasEditor.
 *
 * In Next.js 16, `next/dynamic` with `ssr: false` must be used inside a
 * Client Component (`"use client"`), not a Server Component.
 */

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import type { Template } from "@/lib/db/schema";

const CanvasEditor = dynamic(
  () => import("@/components/builder/canvas-editor"),
  {
    ssr: false,
    loading: () => (
      <div className="flex-1 flex items-center justify-center bg-[#0c0c1a] h-full w-full">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
          <p className="text-xs text-white/40">Loading canvas editor…</p>
        </div>
      </div>
    ),
  }
);

interface CanvasEditorLoaderProps {
  template: Template;
}

export default function CanvasEditorLoader({ template }: CanvasEditorLoaderProps) {
  return <CanvasEditor template={template} />;
}

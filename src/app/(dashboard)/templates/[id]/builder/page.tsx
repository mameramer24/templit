import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Layers } from "lucide-react";
import Link from "next/link";
import type { Template } from "@/lib/db/schema";
import CanvasEditorLoader from "@/components/builder/canvas-editor-loader";

// ── Page props (Next.js 16: params is a Promise) ──────────────────────────────

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const [template] = await db
    .select({ name: templates.name })
    .from(templates)
    .where(eq(templates.id, id))
    .limit(1);

  return {
    title: template ? `${template.name} — Builder | Templit` : "Builder | Templit",
    description: "Edit your template in the Templit canvas builder.",
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function BuilderPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const [template] = await db
    .select()
    .from(templates)
    .where(eq(templates.id, id))
    .limit(1);

  if (!template) notFound();

  return (
    <div className="h-screen flex flex-col bg-[#0f0f1a] overflow-hidden">
      {/* Top bar */}
      <header className="h-12 bg-[#0f0f1a] border-b border-white/10 flex items-center px-4 gap-3 flex-shrink-0 z-20">
        <Link href="/templates" className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Layers className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-bold text-white text-sm">templit</span>
        </Link>

        <span className="text-white/20 text-sm">/</span>

        <Link
          href="/templates"
          className="text-sm text-white/40 hover:text-white transition-colors"
        >
          Templates
        </Link>

        <span className="text-white/20 text-sm">/</span>

        <span className="text-sm text-white font-medium truncate max-w-48">
          {template.name}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-white/30">{session.user.email}</span>
        </div>
      </header>

      {/* Canvas editor loader is a Client Component (required by Next.js 16) */}
      <div className="flex-1 overflow-hidden">
        <CanvasEditorLoader template={template as Template} />
      </div>
    </div>
  );
}

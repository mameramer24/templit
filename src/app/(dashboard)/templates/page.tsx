import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  templates,
  orgMembers,
  type Template,
} from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Plus,
  Image as ImageIcon,
  Video,
  Clock,
  Layers,
  MoreHorizontal,
  FileText,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Templates — Templit",
  description: "Manage and create your image and video templates.",
};

// Force dynamic rendering (session required)
export const dynamic = "force-dynamic";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

// ── Template Card (Server Component) ─────────────────────────────────────────

function TemplateCard({ template }: { template: Template }) {
  const canvas = template.canvas as { width?: number; height?: number } | null;
  const layerCount = Array.isArray(template.layers)
    ? (template.layers as unknown[]).length
    : 0;

  return (
    <Card className="bg-[#16162a] border-white/10 hover:border-indigo-500/40 transition-all duration-200 group overflow-hidden">
      {/* Thumbnail / placeholder */}
      <div className="relative h-36 bg-gradient-to-br from-indigo-950/60 to-purple-950/60 flex items-center justify-center border-b border-white/5">
        {template.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={template.thumbnailUrl}
            alt={template.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 opacity-30">
            {template.type === "video" ? (
              <Video className="h-10 w-10 text-white" />
            ) : (
              <ImageIcon className="h-10 w-10 text-white" />
            )}
            <span className="text-xs text-white">No preview</span>
          </div>
        )}

        {/* Status badge */}
        <Badge
          variant={template.status === "published" ? "default" : "secondary"}
          className={`absolute top-2 right-2 text-[10px] ${
            template.status === "published"
              ? "bg-green-500/20 text-green-400 border-green-500/30"
              : "bg-white/10 text-white/50 border-white/10"
          }`}
        >
          {template.status}
        </Badge>

        {/* Type badge */}
        <Badge
          variant="outline"
          className="absolute top-2 left-2 text-[10px] border-white/20 text-white/50 bg-black/40"
        >
          {template.type === "video" ? (
            <Video className="h-2.5 w-2.5 mr-1" />
          ) : (
            <ImageIcon className="h-2.5 w-2.5 mr-1" />
          )}
          {template.type}
        </Badge>
      </div>

      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm font-medium text-white truncate">
          {template.name}
        </CardTitle>
        {canvas?.width && canvas?.height && (
          <p className="text-[10px] text-white/30 font-mono mt-0.5">
            {canvas.width} × {canvas.height}px
          </p>
        )}
      </CardHeader>

      <CardContent className="px-4 pb-2">
        <div className="flex items-center gap-3 text-[10px] text-white/40">
          <span className="flex items-center gap-1">
            <Layers className="h-3 w-3" />
            {layerCount} layer{layerCount !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDate(template.updatedAt)}
          </span>
        </div>
      </CardContent>

      <CardFooter className="px-4 pb-3 pt-0">
        <Link
          href={`/templates/${template.id}/builder`}
          className="w-full"
        >
          <Button
            id={`open-template-${template.id}`}
            size="sm"
            className="w-full bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/20 hover:border-indigo-500/40 transition-all"
          >
            Open in Builder
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function TemplatesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Resolve org
  const [membership] = await db
    .select({ orgId: orgMembers.orgId })
    .from(orgMembers)
    .where(eq(orgMembers.userId, session.user.id))
    .limit(1);

  const templateList: Template[] = membership
    ? await db
        .select()
        .from(templates)
        .where(eq(templates.orgId, membership.orgId))
        .orderBy(desc(templates.updatedAt))
        .limit(50)
    : [];

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white">
      {/* Nav */}
      <nav className="border-b border-white/10 bg-[#0f0f1a]/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link href="/templates" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Layers className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-white">templit</span>
          </Link>

          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-white/40">
              {session.user.name ?? session.user.email}
            </span>
            <Link href="/api/auth/signout">
              <Button
                size="sm"
                variant="ghost"
                className="text-white/50 hover:text-white"
              >
                Sign out
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Templates</h1>
            <p className="text-sm text-white/40 mt-1">
              {templateList.length} template{templateList.length !== 1 ? "s" : ""}
            </p>
          </div>

          <Link href="/templates/new">
            <Button
              id="new-template-btn"
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/20"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </Link>
        </div>

        {templateList.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="h-16 w-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-white/20" />
            </div>
            <h2 className="text-lg font-semibold text-white/60 mb-2">
              No templates yet
            </h2>
            <p className="text-sm text-white/30 mb-6 max-w-xs">
              Create your first image or video template to get started.
            </p>
            <Link href="/templates/new">
              <Button
                id="create-first-template-btn"
                className="bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create template
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {templateList.map((t) => (
              <TemplateCard key={t.id} template={t} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

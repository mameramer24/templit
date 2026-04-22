/**
 * Route handler: /api/v1/templates
 *
 * GET  /api/v1/templates        — list templates for authenticated org
 * POST /api/v1/templates        — create a new template
 *
 * Auth: all endpoints require a valid session.
 * Org resolution: org is derived from the user's active membership (first joined org for MVP).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  templates,
  orgMembers,
  NewTemplate,
  templateTypeEnum,
  templateStatusEnum,
} from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

// ── Zod validation schemas ────────────────────────────────────────────────────

const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  type: z.enum(["image", "video"]).default("image"),
  canvas: z
    .object({
      width: z.number().int().positive().default(1200),
      height: z.number().int().positive().default(630),
      background: z.string().default("#ffffff"),
      fps: z.number().optional(),
      durationMs: z.number().optional(),
    })
    .optional(),
  layers: z.array(z.record(z.string(), z.unknown())).optional(),
});

type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

// ── GET /api/v1/templates ─────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const typeParam = url.searchParams.get("type");
  const statusParam = url.searchParams.get("status");
  const limitParam = parseInt(url.searchParams.get("limit") ?? "20", 10);
  const limit = Math.min(Math.max(limitParam, 1), 100);

  try {
    // Resolve user's primary org (first membership for MVP)
    const [membership] = await db
      .select({ orgId: orgMembers.orgId })
      .from(orgMembers)
      .where(eq(orgMembers.userId, session.user.id))
      .limit(1);

    if (!membership) {
      return NextResponse.json(
        { error: "No organization found for this user." },
        { status: 403 }
      );
    }

    // Build query with optional filters
    const rows = await db
      .select()
      .from(templates)
      .where(
        eq(templates.orgId, membership.orgId)
      )
      .orderBy(desc(templates.updatedAt))
      .limit(limit);

    const filtered = rows.filter((t) => {
      if (typeParam && t.type !== typeParam) return false;
      if (statusParam && t.status !== statusParam) return false;
      return true;
    });

    return NextResponse.json({
      data: filtered,
      meta: { total: filtered.length, limit },
    });
  } catch (err) {
    console.error("[GET /api/v1/templates]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ── POST /api/v1/templates ────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const input: CreateTemplateInput = parsed.data;

  try {
    // Resolve user's primary org
    const [membership] = await db
      .select({ orgId: orgMembers.orgId })
      .from(orgMembers)
      .where(eq(orgMembers.userId, session.user.id))
      .limit(1);

    if (!membership) {
      return NextResponse.json(
        { error: "No organization found for this user." },
        { status: 403 }
      );
    }

    const newTemplate: NewTemplate = {
      orgId: membership.orgId,
      createdBy: session.user.id,
      name: input.name,
      description: input.description,
      type: input.type,
      status: "draft",
      canvas: input.canvas
        ? {
            width: input.canvas.width ?? 1200,
            height: input.canvas.height ?? 630,
            background: input.canvas.background ?? "#ffffff",
            ...(input.canvas.fps !== undefined ? { fps: input.canvas.fps } : {}),
            ...(input.canvas.durationMs !== undefined ? { durationMs: input.canvas.durationMs } : {}),
          }
        : { width: 1200, height: 630, background: "#ffffff" },
      layers: (input.layers as NewTemplate["layers"]) ?? [],
    };

    const [created] = await db
      .insert(templates)
      .values(newTemplate)
      .returning();

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/v1/templates]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

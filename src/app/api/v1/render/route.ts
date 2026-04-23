import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { validateApiAuth } from "@/lib/api-key-auth";
import { z } from "zod";

const renderSchema = z.object({
  templateId: z.string().min(1),
  variables: z.record(z.string(), z.any()).optional(),
  format: z.enum(["png", "mp4"]).default("png"),
});

/**
 * POST /api/v1/render
 * 
 * Triggers a rendering job for a template.
 * For now, in MVP, it returns a 201 with the template metadata 
 * as if it was processed.
 */
export async function POST(request: NextRequest) {
  const auth = await validateApiAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = renderSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { templateId, variables, format } = parsed.data;

  try {
    // 1. Verify template exists and belongs to org
    const [template] = await db
      .select()
      .from(templates)
      .where(eq(templates.id, templateId))
      .limit(1);

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    if (template.orgId !== auth.orgId) {
      return NextResponse.json({ error: "Unauthorized access to template" }, { status: 403 });
    }

    // 2. In a real production app, we would queue a job here.
    // For the current request, we return the Template ID and a Render ID.
    const renderId = `rnd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    return NextResponse.json({
      success: true,
      data: {
        id: renderId,
        templateId: template.id,
        status: "processing",
        message: "Rendering started. Use the ID to poll status (Simulation).",
        // In this simulation, we return the template names to show we found it
        templateName: template.name,
      }
    }, { status: 201 });

  } catch (err) {
    console.error("[POST /api/v1/render]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Support for OPTIONS (CORS) or other methods can be added here if needed
export async function GET() {
  return NextResponse.json({ error: "Method not allowed. Use POST to trigger renders." }, { status: 405 });
}

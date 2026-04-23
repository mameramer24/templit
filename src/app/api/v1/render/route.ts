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
 * Handle both GET and POST to bypass n8n redirect/method issues
 */
async function handleRequest(request: NextRequest) {
  const auth = await validateApiAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any = {};
  
  if (request.method === "POST") {
    try {
      body = await request.json();
    } catch {
      // Body might be empty or not JSON
    }
  } else {
    // For GET, try to get params from URL
    const url = new URL(request.url);
    body = {
      templateId: url.searchParams.get("templateId"),
      variables: {}, // Advanced variables in GET are complex, skip for now
      format: url.searchParams.get("format") || "png",
    };
  }

  const parsed = renderSchema.safeParse(body);
  if (!parsed.success && request.method === "POST") {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const templateId = parsed.data?.templateId || (body as any).templateId;
  if (!templateId) {
    return NextResponse.json({ error: "templateId is required" }, { status: 400 });
  }

  try {
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

    const renderId = `rnd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    return NextResponse.json({
      success: true,
      data: {
        id: renderId,
        templateId: template.id,
        status: "processing",
        message: "Rendering started. Use the ID to poll status (Simulation).",
        templateName: template.name,
      }
    }, { status: 201 });

  } catch (err) {
    console.error("[Render API]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}

export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    },
  });
}

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

async function handleRender(request: NextRequest) {
  const auth = await validateApiAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {
    // empty body is ok
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
        templateName: template.name,
        status: "processing",
        format,
        variables: variables ?? {},
        message: "Render job queued successfully.",
      }
    }, { status: 201 });

  } catch (err) {
    console.error("[POST /trigger]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return handleRender(request);
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: "Templit Render API",
    usage: "Send POST with { templateId, variables, format }",
    example: {
      templateId: "your-template-id",
      variables: { name: "أحمد علي", name2: "مرحباً!" },
      format: "png"
    }
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-API-Key, Authorization",
    },
  });
}

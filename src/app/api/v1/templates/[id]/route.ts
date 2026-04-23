import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { templates } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { validateApiAuth } from "@/lib/api-key-auth";

/**
 * GET /api/v1/templates/[id]
 * 
 * Fetches details of a specific template.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateApiAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const [template] = await db
      .select()
      .from(templates)
      .where(
        and(
          eq(templates.id, id),
          eq(templates.orgId, auth.orgId) // Security: check org ownership
        )
      )
      .limit(1);

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ data: template });
  } catch (err) {
    console.error("[GET /api/v1/templates/[id]]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/templates/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateApiAuth(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await db.delete(templates).where(
      and(
        eq(templates.id, id),
        eq(templates.orgId, auth.orgId)
      )
    );

    return NextResponse.json({ success: true, message: "Template deleted" });
  } catch (err) {
    console.error("[DELETE /api/v1/templates/[id]]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

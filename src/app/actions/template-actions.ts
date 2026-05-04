"use server";

import { db } from "@/lib/db";
import { templates, orgMembers } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * createTemplateAction
 *
 * Creates a new template record and returns the ID.
 */
export async function createTemplateAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  const type = (formData.get("type") as "image" | "video") || "image";
  const width = parseInt(formData.get("width") as string) || 1200;
  const height = parseInt(formData.get("height") as string) || 630;

  if (!name) throw new Error("Template name is required");

  // Get the user's default/first organization
  const [membership] = await db
    .select({ orgId: orgMembers.orgId })
    .from(orgMembers)
    .where(eq(orgMembers.userId, session.user.id))
    .limit(1);

  if (!membership) throw new Error("No organization found for user. Please create one.");

  const [newTemplate] = await tx_or_db(db).insert(templates).values({
    name,
    type,
    orgId: membership.orgId,
    createdBy: session.user.id,
    status: "draft",
    canvas: { width, height, background: "#ffffff" },
    layers: [],
  }).returning();

  if (!newTemplate) throw new Error("Failed to create template");

  revalidatePath("/templates");
  return { id: newTemplate.id };
}

// Helper to handle both tx and db (simplified for now)
function tx_or_db(db: any) {
  return db;
}

/**
 * saveTemplateLayersAction
 * 
 * Saves the current state of layers and canvas config to the database.
 */
export async function saveTemplateLayersAction(
  templateId: string, 
  canvas: any, 
  layers: any[]
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db
    .update(templates)
    .set({
      canvas,
      layers,
      updatedAt: new Date(),
    })
    .where(eq(templates.id, templateId));

  revalidatePath(`/templates/${templateId}/builder`);
  return { success: true };
}

/**
 * duplicateTemplateAction
 * 
 * Duplicates an existing template and its layers.
 */
export async function duplicateTemplateAction(templateId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Get original template
  const [original] = await db
    .select()
    .from(templates)
    .where(eq(templates.id, templateId))
    .limit(1);

  if (!original) throw new Error("Template not found");

  // Verify ownership via org membership
  const [membership] = await db
    .select({ orgId: orgMembers.orgId })
    .from(orgMembers)
    .where(and(
      eq(orgMembers.userId, session.user.id),
      eq(orgMembers.orgId, original.orgId)
    ))
    .limit(1);

  if (!membership) throw new Error("Unauthorized to access this template's organization");

  // Create new template record
  const newName = `${original.name} Copy`;
  
  const [newTemplate] = await tx_or_db(db).insert(templates).values({
    name: newName,
    type: original.type,
    orgId: original.orgId,
    createdBy: session.user.id,
    status: "draft", // Copies usually start as drafts
    canvas: original.canvas,
    layers: original.layers,
  }).returning();

  if (!newTemplate) throw new Error("Failed to duplicate template");

  revalidatePath("/templates");
  return { id: newTemplate.id, success: true };
}

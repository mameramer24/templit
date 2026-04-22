"use server";

import { db } from "@/lib/db";
import { apiKeys, orgMembers } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq, and } from "drizzle-orm";
import crypto from "node:crypto";
import { revalidatePath } from "next/cache";

/**
 * generateApiKeyAction
 *
 * Creates a new API key for the user's organization.
 * Returns the RAW key to the user (only shown once).
 */
export async function generateApiKeyAction(name: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Get the user's organization
  const [membership] = await db
    .select({ orgId: orgMembers.orgId })
    .from(orgMembers)
    .where(eq(orgMembers.userId, session.user.id))
    .limit(1);

  if (!membership) throw new Error("No organization found");

  // Generate a random key
  // Format: tp_live_[random_hex]
  const rawKey = `tp_live_${crypto.randomBytes(24).toString("hex")}`;
  
  // Hash the key using SHA-256 for storage
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

  await db.insert(apiKeys).values({
    name,
    keyHash,
    userId: session.user.id,
    orgId: membership.orgId,
  });

  revalidatePath("/api-keys");

  // Return the raw key to the client for one-time display
  return { rawKey };
}

/**
 * revokeApiKeyAction
 */
export async function revokeApiKeyAction(keyId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await db.delete(apiKeys).where(
    and(
      eq(apiKeys.id, keyId),
      eq(apiKeys.userId, session.user.id) // Security: ensure user owns the key
    )
  );

  revalidatePath("/api-keys");
  return { success: true };
}

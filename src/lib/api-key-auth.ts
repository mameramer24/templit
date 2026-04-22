import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiKeys, orgMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { crypto } from "node:crypto";

export interface ApiAuthResult {
  userId: string;
  orgId: string;
  isApiKey: boolean;
}

/**
 * validateApiAuth
 * 
 * Authenticates a request using either:
 * 1. NextAuth session (for browser-based calls)
 * 2. X-API-Key header (for headless/server-to-server calls)
 */
export async function validateApiAuth(request: NextRequest): Promise<ApiAuthResult | null> {
  // 1. Try Session Auth first (if browser is logged in)
  const session = await auth();
  if (session?.user?.id) {
    // Resolve user's primary org
    const [membership] = await db
      .select({ orgId: orgMembers.orgId })
      .from(orgMembers)
      .where(eq(orgMembers.userId, session.user.id))
      .limit(1);

    if (membership) {
      return {
        userId: session.user.id,
        orgId: membership.orgId,
        isApiKey: false
      };
    }
  }

  // 2. Try API Key Auth
  const apiKey = request.headers.get("X-API-Key");
  if (apiKey) {
    // Hash the provided key to compare with the DB
    const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

    const [keyRecord] = await db
      .select({ 
        id: apiKeys.id,
        userId: apiKeys.userId, 
        orgId: apiKeys.orgId 
      })
      .from(apiKeys)
      .where(eq(apiKeys.keyHash, keyHash))
      .limit(1);

    if (keyRecord) {
      // Update last used timestamp (async, don't wait for completion to keep response fast)
      void db.update(apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKeys.id, keyRecord.id));

      return {
        userId: keyRecord.userId,
        orgId: keyRecord.orgId,
        isApiKey: true
      };
    }
  }

  return null;
}

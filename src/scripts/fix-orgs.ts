import "dotenv/config";
import { db } from "../lib/db";
import { users, organizations, orgMembers } from "../lib/db/schema";
import { eq } from "drizzle-orm";

async function fixUserOrg() {
  console.log("🔍 Checking users for missing organizations...");

  const allUsers = await db.select().from(users);

  for (const user of allUsers) {
    const [membership] = await db
      .select()
      .from(orgMembers)
      .where(eq(orgMembers.userId, user.id))
      .limit(1);

    if (!membership) {
      console.log(`⚠️ User ${user.email} has no organization. Creating one...`);

      const [org] = await db
        .insert(organizations)
        .values({
          name: `${user.name || user.email}'s Workspace`,
          slug: (user.email?.split("@")[0] || "workspace") + "-" + Math.random().toString(36).slice(2, 6),
        })
        .returning();

      if (!org) throw new Error("Failed to create org");

      await db.insert(orgMembers).values({
        userId: user.id,
        orgId: org.id,
        role: "owner",
      });

      console.log(`✅ Fixed organization for ${user.email}`);
    } else {
      console.log(`✨ User ${user.email} already has organization ${membership.orgId}`);
    }
  }

  console.log("🏁 Done.");
}

fixUserOrg().catch(console.error);

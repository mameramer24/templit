/**
 * seed-superadmins.ts
 *
 * Creates or upgrades the two specified accounts to "superadmin" role.
 *
 * Usage:
 *   npx tsx scripts/seed-superadmins.ts
 *
 * Requires DATABASE_URL to be set in your environment (via .env.local).
 *
 * What it does:
 *  - For each email: if the user EXISTS → sets passwordHash + role = superadmin
 *  - For each email: if the user DOESN'T EXIST → creates the account with role = superadmin
 */

import "dotenv/config"; // loads .env.local automatically via dotenv

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import * as schema from "../src/lib/db/schema";

// ── Config ────────────────────────────────────────────────────────────────────

const SUPERADMINS: { email: string; displayName: string }[] = [
  { email: "mameramer24@gmail.com", displayName: "Mohammad Amer" },
  { email: "aram.iq506@gmail.com", displayName: "Aram" },
];

// Password is read from SUPERADMIN_PASSWORD env var, falling back to the
// hardcoded default for initial seeding. CHANGE THIS after first run.
const RAW_PASSWORD =
  process.env["SUPERADMIN_PASSWORD"] ?? "Wawewawe2424@@&&!!";

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env["DATABASE_URL"]) {
    console.error(
      "❌  DATABASE_URL is not set. Copy .env.example → .env.local and fill it in."
    );
    process.exit(1);
  }

  const sql = neon(process.env["DATABASE_URL"]);
  const db = drizzle(sql, { schema });

  // Hash once — bcrypt salt rounds = 12 (good balance of speed vs. security)
  console.log("🔐 Hashing password…");
  const passwordHash = await bcrypt.hash(RAW_PASSWORD, 12);

  for (const { email, displayName } of SUPERADMINS) {
    console.log(`\n👤 Processing: ${email}`);

    const [existing] = await db
      .select({ id: schema.users.id, role: schema.users.role })
      .from(schema.users)
      .where(eq(schema.users.email, email.toLowerCase()))
      .limit(1);

    if (existing) {
      // Update existing account
      await db
        .update(schema.users)
        .set({
          passwordHash,
          role: "superadmin",
          displayName,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, existing.id));

      console.log(
        `   ✅ Updated (was: ${existing.role}) → role: superadmin`
      );
    } else {
      // Create new account
      await db.insert(schema.users).values({
        email: email.toLowerCase(),
        passwordHash,
        displayName,
        role: "superadmin",
        name: displayName,
      });

      console.log(`   ✅ Created new superadmin account`);
    }
  }

  console.log("\n🎉 Done! Both accounts are now superadmins.");
  console.log("   Login at: /login");
  console.log(`   Email 1 : mameramer24@gmail.com`);
  console.log(`   Email 2 : aram.iq506@gmail.com`);
  console.log(`   Password: ${RAW_PASSWORD}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});

"use server";

import { db } from "@/lib/db";
import { users, organizations, orgMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

/**
 * registerAction
 *
 * Handles public sign-up:
 *  1. Hash password
 *  2. Create user
 *  3. Create default organization
 *  4. Link user to organization as 'owner'
 *  5. Redirect to login
 */
export async function registerAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  if (!email || !password || !name) {
    throw new Error("All fields are required");
  }

  // 1. Check if user already exists
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);

  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  // 2. Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // 3. Perform atomic creation using a transaction
  try {
    await db.transaction(async (tx) => {
      // a. Create user
      const [newUser] = await tx
        .insert(users)
        .values({
          email: email.toLowerCase().trim(),
          passwordHash,
          name,
          displayName: name,
        })
        .returning();

      if (!newUser) throw new Error("Failed to create user");

      // b. Create default organization for the user
      const [newOrg] = await tx
        .insert(organizations)
        .values({
          name: `${name}'s Workspace`,
          slug: email.split("@")[0] + "-" + Math.random().toString(36).slice(2, 7),
        })
        .returning();

      if (!newOrg) throw new Error("Failed to create organization");

      // c. Link user to org
      await tx.insert(orgMembers).values({
        orgId: newOrg.id,
        userId: newUser.id,
        role: "owner",
      });
    });
  } catch (err: any) {
    console.error("Registration error:", err);
    throw new Error(err.message || "Something went wrong during registration");
  }

  // Success! Redirect to login (or could auto-login if using session)
  redirect("/login?registered=true");
}

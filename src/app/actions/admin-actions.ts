"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, type UserRole } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

/**
 * Ensures the caller is a superadmin.
 * In a real app, this would be a shared middleware or utility.
 */
async function ensureSuperAdmin() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (role !== "superadmin") {
    throw new Error("Unauthorized: Super Admin access required");
  }
  return session;
}

// ── User Creation ─────────────────────────────────────────────────────────────

export async function createUserAction(formData: FormData) {
  await ensureSuperAdmin();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;
  const role = (formData.get("role") as UserRole) || "user";

  if (!email || !password) throw new Error("Email and password are required");

  const passwordHash = await bcrypt.hash(password, 12);

  await db.insert(users).values({
    email: email.toLowerCase().trim(),
    name,
    displayName: name,
    passwordHash,
    role,
  });

  revalidatePath("/admin/users");
  return { success: true };
}

// ── User Update (Role/Password) ────────────────────────────────────────────────

export async function updateUserAction(userId: string, formData: FormData) {
  const session = await ensureSuperAdmin();

  // Prevent self-modifying role to avoid accidental lockouts (optional)
  const role = formData.get("role") as UserRole;
  const password = formData.get("password") as string | null;
  const name = formData.get("name") as string | null;

  const data: any = { updatedAt: new Date() };
  if (role) data.role = role;
  if (name) {
    data.name = name;
    data.displayName = name;
  }
  if (password && password.length > 0) {
    data.passwordHash = await bcrypt.hash(password, 12);
  }

  await db.update(users).set(data).where(eq(users.id, userId));

  revalidatePath("/admin/users");
  return { success: true };
}

// ── Blocking / Suspension ──────────────────────────────────────────────────────

export async function toggleUserBlockAction(userId: string, isBlocked: boolean) {
  const session = await ensureSuperAdmin();

  // Prevent blocking self
  if (session?.user?.id && userId === session.user.id) {
    throw new Error("You cannot block your own account");
  }

  await db
    .update(users)
    .set({ isBlocked, updatedAt: new Date() })
    .where(eq(users.id, userId));

  revalidatePath("/admin/users");
  return { success: true };
}

// ── Deletion ───────────────────────────────────────────────────────────────────

export async function deleteUserAction(userId: string) {
  const session = await ensureSuperAdmin();

  // Prevent deleting self
  if (session?.user?.id && userId === session.user.id) {
    throw new Error("You cannot delete your own account");
  }

  await db.delete(users).where(eq(users.id, userId));

  revalidatePath("/admin/users");
  return { success: true };
}

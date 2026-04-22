/**
 * NextAuth.js v5 (Auth.js beta) configuration
 *
 * Exports: { handlers, auth, signIn, signOut }
 *  - handlers → mount at app/api/auth/[...nextauth]/route.ts
 *  - auth      → use in Server Components / Route Handlers to get session
 *  - signIn / signOut → use in Server Actions or Client Components
 */

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db/index";
import { users } from "@/lib/db/schema";
import type { NextAuthConfig, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import type { UserRole } from "@/lib/db/schema";

export const authConfig = {
  // ── Adapter ────────────────────────────────────────────────────────────────
  adapter: DrizzleAdapter(db),

  // ── Session strategy ───────────────────────────────────────────────────────
  session: { strategy: "jwt" as const },

  // ── Pages ──────────────────────────────────────────────────────────────────
  pages: {
    signIn: "/login",
    error: "/login",
  },

  // ── Providers ─────────────────────────────────────────────────────────────
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (
          typeof credentials?.email !== "string" ||
          typeof credentials?.password !== "string"
        ) {
          return null;
        }

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email.toLowerCase().trim()))
          .limit(1);

        if (!user?.passwordHash) return null;

        // ❌ Check if account is suspended
        if (user.isBlocked) {
          throw new Error("account_blocked");
        }

        const passwordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!passwordValid) return null;

        // Return id, email, name AND role so the JWT callback can persist it
        return {
          id: user.id,
          email: user.email,
          name: user.displayName ?? user.name,
          image: user.image,
          // Custom field — will be picked up in the JWT callback below
          role: user.role,
        };
      },
    }),
  ],

  // ── Callbacks ─────────────────────────────────────────────────────────────
  callbacks: {
    async jwt({
      token,
      user,
    }: {
      token: JWT;
      user?: { id?: string; role?: UserRole } | null;
    }) {
      // On initial sign-in, persist id and role into the JWT
      if (user?.id) token["userId"] = user.id;
      if (user?.role) token["role"] = user.role;
      return token;
    },

    async session({
      session,
      token,
    }: {
      session: Session;
      token: JWT;
    }) {
      if (token["userId"] && typeof token["userId"] === "string" && session.user) {
        session.user.id = token["userId"];
      }
      // Attach role to session.user so pages/routes can read it
      if (token["role"] && session.user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any)["role"] = token["role"] as UserRole;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

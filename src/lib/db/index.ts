/**
 * Drizzle ORM database connection — Neon (serverless PostgreSQL)
 *
 * We use @neondatabase/serverless instead of the regular pg driver because:
 *  1. It works in Vercel Edge & Serverless Functions without native bindings.
 *  2. It supports WebSocket-based keepalive which reduces cold-start latency.
 *  3. It is the officially recommended driver for Neon + Next.js deployments.
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "[db] DATABASE_URL environment variable is not set.\n" +
      "Copy .env.example → .env.local and fill in your Neon connection string."
  );
}

/**
 * neon() returns a tagged-template SQL executor bound to the Neon HTTP API.
 * drizzle() wraps it with the ORM query builder.
 */
const sql = neon(process.env.DATABASE_URL);

export const db = drizzle(sql, {
  schema,
  // Drizzle logger — logs every query in development to help spot N+1s.
  logger: process.env.NODE_ENV === "development",
});

export type Db = typeof db;

// Re-export schema so consumers can do: import { db, users } from "@/lib/db"
export * from "./schema";

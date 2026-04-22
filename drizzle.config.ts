import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit configuration.
 *
 * Environment variables required:
 *   DATABASE_URL  — Neon PostgreSQL connection string
 *                   (postgres://user:pass@host/db?sslmode=require)
 *
 * Commands:
 *   npx drizzle-kit generate   → generates SQL migration files under ./drizzle/migrations
 *   npx drizzle-kit migrate    → applies pending migrations to the database
 *   npx drizzle-kit studio     → opens Drizzle Studio in the browser
 *   npx drizzle-kit push       → pushes schema diff directly (dev only)
 */
export default defineConfig({
  // Path to the schema file (or a glob for multiple schema files)
  schema: "./src/lib/db/schema.ts",

  // Output directory for generated SQL migrations
  out: "./drizzle/migrations",

  // Dialect must match the database driver
  dialect: "postgresql",

  dbCredentials: {
    // Neon provides a WebSocket-based connection string; drizzle-kit uses the
    // standard postgres:// URL for migrations (not the WebSocket one).
    url: process.env.DATABASE_URL!,
  },

  // Print every SQL statement that drizzle-kit generates
  verbose: true,

  // Enforce that every migration is reviewed before being applied
  strict: true,
});

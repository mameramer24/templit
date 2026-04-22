/**
 * Drizzle ORM schema — templit platform
 *
 * Tables
 * ──────
 *  users           – platform accounts (credentials + OAuth)
 *  accounts        – OAuth provider accounts (required by @auth/drizzle-adapter)
 *  sessions        – active sessions (required by @auth/drizzle-adapter)
 *  verificationTokens – email verification (required by @auth/drizzle-adapter)
 *  organizations   – multi-tenant workspace
 *  orgMembers      – M:M users ↔ organizations with role
 *  templates       – image/video templates with JSONB canvas + layers
 *  renderJobs      – client-triggered render tasks
 */

import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  primaryKey,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const planEnum = pgEnum("plan", ["starter", "pro", "business"]);

export const templateTypeEnum = pgEnum("template_type", ["image", "video"]);

export const templateStatusEnum = pgEnum("template_status", [
  "draft",
  "published",
]);

export const renderStatusEnum = pgEnum("render_status", [
  "queued",
  "processing",
  "completed",
  "failed",
]);

export const memberRoleEnum = pgEnum("member_role", [
  "owner",
  "admin",
  "member",
]);

/**
 * Platform-level role — scoped to the entire Templit installation.
 *  superadmin → full access to all orgs, users, and platform settings
 *  admin      → elevated access (future use)
 *  user       → normal tenant account
 */
export const userRoleEnum = pgEnum("user_role", [
  "user",
  "admin",
  "superadmin",
]);

export type UserRole = (typeof userRoleEnum.enumValues)[number];

// ─── users ────────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name"),
    email: text("email").notNull().unique(),
    emailVerified: timestamp("email_verified", { mode: "date" }),
    image: text("image"),
    passwordHash: text("password_hash"), // null for OAuth-only accounts
    displayName: varchar("display_name", { length: 100 }),
    /** Platform-level role. Checked by proxy.ts and API routes. */
    role: userRoleEnum("role").notNull().default("user"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("user_role_idx").on(table.role)]
);

// ─── accounts (Auth.js adapter requirement) ───────────────────────────────────

export const accounts = pgTable(
  "accounts",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [primaryKey({ columns: [table.provider, table.providerAccountId] })]
);

// ─── sessions (Auth.js adapter requirement) ───────────────────────────────────

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

// ─── verificationTokens (Auth.js adapter requirement) ─────────────────────────

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })]
);

// ─── organizations ────────────────────────────────────────────────────────────

/**
 * limits JSONB shape example:
 * {
 *   "maxTemplates": 10,
 *   "maxRendersPerMonth": 500,
 *   "maxStorageGb": 5
 * }
 */
export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 60 }).notNull().unique(),
    plan: planEnum("plan").notNull().default("starter"),
    limits: jsonb("limits").$type<{
      maxTemplates: number;
      maxRendersPerMonth: number;
      maxStorageGb: number;
    }>(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("org_slug_idx").on(table.slug)]
);

// ─── orgMembers ───────────────────────────────────────────────────────────────

export const orgMembers = pgTable(
  "org_members",
  {
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull().default("member"),
    joinedAt: timestamp("joined_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.orgId, table.userId] })]
);

// ─── templates ────────────────────────────────────────────────────────────────

/**
 * canvas JSONB — Konva stage snapshot
 * {
 *   "width": 1920,
 *   "height": 1080,
 *   "background": "#ffffff"
 * }
 *
 * layers JSONB — array of layer descriptors
 * [
 *   { "id": "layer_1", "type": "text", "x": 100, "y": 200, "text": "Hello", "fontSize": 48, "fill": "#000000" },
 *   { "id": "layer_2", "type": "image", "x": 0,   "y": 0,   "src": "https://..." }
 * ]
 */
export const templates = pgTable(
  "templates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    type: templateTypeEnum("type").notNull().default("image"),
    status: templateStatusEnum("status").notNull().default("draft"),
    thumbnailUrl: text("thumbnail_url"),
    canvas: jsonb("canvas").$type<{
      width: number;
      height: number;
      background: string;
      fps?: number;          // for video templates
      durationMs?: number;   // for video templates
    }>(),
    layers: jsonb("layers").$type<
      Array<{
        id: string;
        type: "text" | "image" | "rect" | "video";
        x: number;
        y: number;
        width?: number;
        height?: number;
        rotation?: number;
        opacity?: number;
        locked?: boolean;
        visible?: boolean;
        // text-specific
        text?: string;
        fontSize?: number;
        fontFamily?: string;
        fontStyle?: string;
        fill?: string;
        align?: string;
        // image/video-specific
        src?: string;
        // rect-specific
        cornerRadius?: number;
        stroke?: string;
        strokeWidth?: number;
        // variable binding: key → dynamic data field
        variable?: string;
      }>
    >(),
    isPublic: boolean("is_public").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("template_org_idx").on(table.orgId),
    index("template_type_idx").on(table.type),
    index("template_status_idx").on(table.status),
  ]
);

// ─── renderJobs ───────────────────────────────────────────────────────────────

/**
 * inputData JSONB — key/value pairs injected into template variables at render time
 * { "name": "Ahmad", "logo": "https://...", "date": "2024-12-01" }
 */
export const renderJobs = pgTable(
  "render_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    templateId: uuid("template_id")
      .notNull()
      .references(() => templates.id, { onDelete: "cascade" }),
    requestedBy: uuid("requested_by").references(() => users.id, {
      onDelete: "set null",
    }),
    inputData: jsonb("input_data").$type<Record<string, string>>(),
    status: renderStatusEnum("status").notNull().default("queued"),
    outputUrl: text("output_url"),
    errorMessage: text("error_message"),
    durationMs: integer("duration_ms"), // client-side render duration
    expiresAt: timestamp("expires_at", { mode: "date" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("render_org_idx").on(table.orgId),
    index("render_template_idx").on(table.templateId),
    index("render_status_idx").on(table.status),
  ]
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  orgMemberships: many(orgMembers),
  templates: many(templates),
  renderJobs: many(renderJobs),
}));

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(orgMembers),
  templates: many(templates),
  renderJobs: many(renderJobs),
}));

export const orgMembersRelations = relations(orgMembers, ({ one }) => ({
  organization: one(organizations, {
    fields: [orgMembers.orgId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [orgMembers.userId],
    references: [users.id],
  }),
}));

export const templatesRelations = relations(templates, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [templates.orgId],
    references: [organizations.id],
  }),
  creator: one(users, {
    fields: [templates.createdBy],
    references: [users.id],
  }),
  renderJobs: many(renderJobs),
}));

export const renderJobsRelations = relations(renderJobs, ({ one }) => ({
  organization: one(organizations, {
    fields: [renderJobs.orgId],
    references: [organizations.id],
  }),
  template: one(templates, {
    fields: [renderJobs.templateId],
    references: [templates.id],
  }),
  requestedBy: one(users, {
    fields: [renderJobs.requestedBy],
    references: [users.id],
  }),
}));

// ─── Type exports (inferred from schema) ──────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;

export type OrgMember = typeof orgMembers.$inferSelect;

export type Template = typeof templates.$inferSelect;
export type NewTemplate = typeof templates.$inferInsert;

export type RenderJob = typeof renderJobs.$inferSelect;
export type NewRenderJob = typeof renderJobs.$inferInsert;

/**
 * NextAuth.js v5 route handler
 * Mounted at: /api/auth/[...nextauth]
 *
 * In v5, re-export GET and POST from the handlers object.
 */
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;

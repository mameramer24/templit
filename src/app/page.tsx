import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * Root page — redirects authenticated users to /templates,
 * unauthenticated users to /login.
 */
export default async function RootPage() {
  const session = await auth();
  redirect(session ? "/templates" : "/login");
}

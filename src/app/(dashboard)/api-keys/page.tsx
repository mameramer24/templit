import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { apiKeys, orgMembers } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Key, Shield, Calendar, Trash2, Plus, Copy, CheckCircle2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ApiKeyManager } from "./api-key-manager";
import { CopyIdButton } from "@/components/ui/copy-id-button";

export default async function ApiKeysPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Get user's org membership
  const [membership] = await db
    .select({ orgId: orgMembers.orgId })
    .from(orgMembers)
    .where(eq(orgMembers.userId, session.user.id))
    .limit(1);

  if (!membership) {
    return (
      <div className="p-8 text-center text-white/40">
        No organization found. Please log in again.
      </div>
    );
  }

  // Fetch keys
  const keys = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.orgId, membership.orgId))
    .orderBy(desc(apiKeys.createdAt));

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white">
       {/* Nav */}
       <nav className="border-b border-white/10 bg-[#0f0f1a]/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link href="/templates" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Key className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-white">templit</span>
          </Link>
          
          <div className="flex items-center gap-6 ml-8">
            <Link href="/templates" className="text-sm font-medium text-white/50 hover:text-white transition-colors">
              Templates
            </Link>
            <Link href="/api-keys" className="text-sm font-medium text-white transition-colors">
              API Keys
            </Link>
            <Link href="/docs" className="text-sm font-medium text-white/50 hover:text-white transition-colors">
              Docs
            </Link>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-white/40">{session.user.email}</span>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-3">API Keys</h1>
            <p className="text-lg text-white/40">
              Generate and manage access tokens for headless rendering.
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
             <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Organization ID</p>
                <code className="text-xs text-indigo-400 font-mono">{membership.orgId}</code>
             </div>
             <CopyIdButton id={membership.orgId} label="Org ID" />
          </div>
        </div>

        {/* Security Warning */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-4 mb-8">
           <AlertTriangle className="h-6 w-6 text-amber-500 flex-shrink-0" />
           <div className="text-sm">
              <p className="text-amber-500 font-semibold mb-1">Protect your keys</p>
              <p className="text-white/60">
                API keys carry full access to your organization. Never share them publicly or include them in client-side code.
              </p>
           </div>
        </div>

        {/* Manage Keys (Client Component) */}
        <ApiKeyManager initialKeys={keys} />
      </main>

      {/* Decorative background gradients */}
      <div className="fixed top-0 right-0 w-[600px] h-[600px] bg-indigo-600/5 blur-[120px] pointer-events-none -z-10 rounded-full" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-purple-600/5 blur-[100px] pointer-events-none -z-10 rounded-full" />
    </div>
  );
}

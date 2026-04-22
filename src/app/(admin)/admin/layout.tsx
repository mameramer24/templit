import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Users, LayoutDashboard, Settings, ShieldCheck } from "lucide-react";
import Link from "next/link";

/**
 * Admin Layout (App Router)
 *
 * Provides a distinct sidebar for platform administration.
 * Re-verifies superadmin role on the server side.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = (session?.user as any)?.role;

  if (role !== "superadmin") {
    redirect("/templates");
  }

  return (
    <div className="flex h-screen bg-[#0a0a14] text-white">
      {/* Admin Sidebar */}
      <aside className="w-64 border-r border-white/5 flex flex-col bg-[#0c0c1a]">
        <div className="p-6 border-b border-white/5 bg-gradient-to-br from-indigo-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold tracking-tight text-lg">Templit Admin</span>
          </div>
          <p className="mt-1 text-[10px] text-white/40 uppercase tracking-widest font-semibold font-mono">
            Platform Ops
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <Link
            href="/admin"
            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all group"
          >
            <LayoutDashboard className="h-4 w-4 group-hover:text-indigo-400 transition-colors" />
            Dashboard
          </Link>

          <Link
            href="/admin/users"
            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-sm"
          >
            <Users className="h-4 w-4" />
            User Management
          </Link>

          <Link
            href="/admin/settings"
            className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all group"
          >
            <Settings className="h-4 w-4 group-hover:text-indigo-400 transition-colors" />
            Platform Config
          </Link>
        </nav>

        <div className="p-4 border-t border-white/5">
          <Link
            href="/templates"
            className="flex items-center justify-center gap-2 w-full py-2 px-4 text-xs font-medium border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
          >
            ← Exit Admin Mode
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/10 via-transparent to-transparent">
        {children}
      </main>
    </div>
  );
}

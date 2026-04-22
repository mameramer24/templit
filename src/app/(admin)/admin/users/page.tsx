import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { 
  UserPlus, 
  Search, 
  MoreHorizontal, 
  Mail, 
  Calendar, 
  Shield, 
  Ban, 
  Trash2,
  KeyRound,
  UserCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  toggleUserBlockAction, 
  deleteUserAction 
} from "@/app/actions/admin-actions";
import { auth } from "@/lib/auth";
import { CreateUserDialog } from "@/components/admin/create-user-dialog";
import { UpdateUserDialog } from "@/components/admin/update-user-dialog";
import type { UserRole } from "@/lib/db/schema";

/**
 * User Management Page (Server Component)
 */
export default async function UsersPage() {
  const session = await auth();
  const currentUserId = session?.user?.id;
  
  // Fetch all users sorted by most recent
  const allUsers = await db.query.users.findMany({
    orderBy: [desc(users.createdAt)],
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-white/40 text-sm mt-1">
            Manage platform accounts, roles, and access status.
          </p>
        </div>
        
        {/* Dialog for creating a new user */}
        <CreateUserDialog />
      </div>

      <div className="grid gap-6">
        {/* Search & Filters */}
        <Card className="bg-[#0c0c1a] border-white/5 p-4 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <Input 
              placeholder="Search by name or email..." 
              className="pl-10 bg-white/5 border-white/10"
            />
          </div>
          <Button variant="outline" className="border-white/10 hover:bg-white/5">
            Filter
          </Button>
        </Card>

        {/* Users Table */}
        <Card className="bg-[#0c0c1a] border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-white/40 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 font-medium">User</th>
                  <th className="px-6 py-4 font-medium">Role</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Joined</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {allUsers.map((user) => (
                  <tr key={user.id} className="group hover:bg-white/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center border border-white/5 text-xs font-bold text-indigo-300">
                          {user.name?.[0] || (user.email?.[0] || "?").toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{user.displayName || user.name || "Unnamed"}</p>
                          <p className="text-white/40 text-xs flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge 
                        variant={user.role === 'superadmin' ? 'default' : 'outline'}
                        className={user.role === 'superadmin' ? 'bg-indigo-600 text-white' : 'border-white/10 bg-white/5'}
                      >
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      {user.isBlocked ? (
                        <div className="flex items-center gap-1.5 text-rose-400">
                          <Ban className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">Blocked</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-emerald-400">
                          <UserCheck className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">Active</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-white/40 tabular-nums">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        
                        {/* 🔒 Password & Role Update */}
                        <UpdateUserDialog user={{
                          id: user.id,
                          name: user.displayName || user.name,
                          email: user.email,
                          role: user.role as UserRole
                        }} />

                        {/* 🚫 Block/Unblock Action */}
                        {user.id !== currentUserId && (
                          <form action={async () => {
                            "use server";
                            await toggleUserBlockAction(user.id, !user.isBlocked);
                          }}>
                            <Button 
                              type="submit"
                              variant="ghost" 
                              size="icon" 
                              className={`h-8 w-8 ${user.isBlocked ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-rose-400 hover:bg-rose-500/10'}`}
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          </form>
                        )}

                        {/* 🗑️ Delete Action */}
                        {user.id !== currentUserId && (
                          <form action={async () => {
                            "use server";
                            await deleteUserAction(user.id);
                          }}>
                            <Button 
                              type="submit"
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-rose-400 hover:bg-rose-500/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </form>
                        )}
                        
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Background Decor */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] pointer-events-none -z-10 rounded-full" />
      <div className="fixed bottom-0 left-0 w-[300px] h-[300px] bg-purple-600/5 blur-[100px] pointer-events-none -z-10 rounded-full" />
    </div>
  );
}

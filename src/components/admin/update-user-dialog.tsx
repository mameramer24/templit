"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { KeyRound, Loader2 } from "lucide-react";
import { updateUserAction } from "@/app/actions/admin-actions";
import { toast } from "sonner";
import type { UserRole } from "@/lib/db/schema";

interface UpdateUserDialogProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    role: UserRole;
  };
}

/**
 * UpdateUserDialog
 *
 * Allows superadmins to reset passwords or change roles/names.
 */
export function UpdateUserDialog({ user }: UpdateUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    try {
      await updateUserAction(user.id, formData);
      toast.success(`User ${user.email} updated successfully`);
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update user");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-indigo-500/10 hover:text-indigo-400">
            <KeyRound className="h-4 w-4" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px] bg-[#0c0c1a] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Update User: {user.name || user.email}</DialogTitle>
          <DialogDescription className="text-white/40">
            Modify credentials, role, or display name for this account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={user.name || ""}
              className="bg-white/5 border-white/10"
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="role">Platform Role</Label>
            <Select name="role" defaultValue={user.role}>
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent className="bg-[#0c0c1a] border-white/10 text-white">
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="superadmin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">New Password (Direct Reset)</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Leave empty to keep existing password"
              className="bg-white/5 border-white/10"
            />
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Update Account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

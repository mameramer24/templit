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
import { UserPlus, Loader2 } from "lucide-react";
import { createUserAction } from "@/app/actions/admin-actions";
import { toast } from "sonner";

/**
 * CreateUserDialog
 *
 * Allows superadmins to manually register new users.
 */
export function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    try {
      await createUserAction(formData);
      toast.success("User created successfully");
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2">
            <UserPlus className="h-4 w-4" />
            Create New User
          </Button>
        }
      />
      <DialogContent className="sm:max-w-[425px] bg-[#0c0c1a] border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
          <DialogDescription className="text-white/40">
            Add a new platform account manually.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g. Ahmad Ali"
              className="bg-white/5 border-white/10"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="user@example.com"
              className="bg-white/5 border-white/10"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Initial Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              className="bg-white/5 border-white/10"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role">Platform Role</Label>
            <Select name="role" defaultValue="user">
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
              Create User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

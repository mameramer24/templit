"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Trash2, 
  Copy, 
  CheckCircle2, 
  Key, 
  Calendar,
  Loader2,
  X
} from "lucide-react";
import { 
  generateApiKeyAction, 
  revokeApiKeyAction 
} from "@/app/actions/api-key-actions";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import type { ApiKey } from "@/lib/db/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ApiKeyManagerProps {
  initialKeys: ApiKey[];
}

export function ApiKeyManager({ initialKeys }: ApiKeyManagerProps) {
  const [keys, setKeys] = useState<ApiKey[]>(initialKeys);
  const [newKeyRaw, setNewKeyRaw] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;

    try {
      const { rawKey } = await generateApiKeyAction(name);
      setNewKeyRaw(rawKey);
      setShowDialog(true);
      // Note: revalidatePath in action will refresh initialKeys if we were using server components fully,
      // but here we just refresh our local state for instant feedback if we had a full list update.
      // For simplicity, we just assume the user will refresh or we could re-fetch.
      window.location.reload(); // Refresh to see the new key metadata
    } catch (err: any) {
      toast.error(err.message || "Failed to create key");
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm("Are you sure? This will immediately disable all integrations using this key.")) return;
    
    try {
      await revokeApiKeyAction(id);
      setKeys(keys.filter(k => k.id !== id));
      toast.success("Key revoked");
    } catch (err: any) {
      toast.error("Failed to revoke key");
    }
  }

  function copyToClipboard() {
    if (!newKeyRaw) return;
    navigator.clipboard.writeText(newKeyRaw);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Create Key Card */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Plus className="h-4 w-4 text-indigo-400" />
          Create New Key
        </h3>
        <form onSubmit={handleCreate} className="flex gap-4">
          <Input 
            name="name"
            placeholder="e.g. Production Server" 
            required 
            className="bg-white/5 border-white/10 text-white focus:ring-indigo-500"
          />
          <Button 
            type="submit" 
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 whitespace-nowrap"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate Key"}
          </Button>
        </form>
      </div>

      {/* Keys List */}
      <div className="space-y-4">
        {keys.length === 0 ? (
          <div className="py-12 text-center text-white/20 border border-dashed border-white/10 rounded-2xl">
            No API keys found.
          </div>
        ) : (
          keys.map((key) => (
            <div 
              key={key.id}
              className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-white/[0.07] transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                  <Key className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <h4 className="font-bold text-white mb-1">{key.name}</h4>
                  <div className="flex items-center gap-4 text-xs text-white/40">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      Created {new Date(key.createdAt).toLocaleDateString()}
                    </span>
                    <span className="font-mono text-indigo-400/50">
                      tp_live_••••{key.keyHash.slice(-4)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                 <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 py-1">
                    Active
                 </Badge>
                 <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleRevoke(key.id)}
                    className="text-white/20 hover:text-red-400 hover:bg-red-400/10"
                 >
                    <Trash2 className="h-4 w-4" />
                 </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Secret Display Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-[#121225] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2 text-emerald-400">
               <CheckCircle2 className="h-6 w-6" />
               Key Generated!
            </DialogTitle>
            <DialogDescription className="text-white/40 pt-2">
              Please copy your API key now. You won&apos;t be able to see it again for security reasons.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 space-y-4">
            <div className="relative group">
               <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-indigo-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
               <div className="relative bg-black flex items-center justify-between p-4 rounded-xl border border-white/10 gap-3">
                  <code className="text-emerald-400 font-mono text-sm break-all">
                    {newKeyRaw}
                  </code>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={copyToClipboard}
                    className="flex-shrink-0 hover:bg-white/10"
                  >
                    {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </Button>
               </div>
            </div>

            <Button 
              className="w-full bg-white/10 hover:bg-white/20 border border-white/10"
              onClick={() => setShowDialog(false)}
            >
              I&apos;ve stored it securely
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

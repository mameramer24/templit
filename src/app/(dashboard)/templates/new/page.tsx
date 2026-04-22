"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Image as ImageIcon, Video, ArrowLeft, Loader2, Wand2 } from "lucide-react";
import Link from "next/link";
import { createTemplateAction } from "@/app/actions/template-actions";
import { toast } from "sonner";

export default function NewTemplatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    try {
      const result = await createTemplateAction(formData);
      toast.success("Template created!");
      router.push(`/templates/${result.id}/builder`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create template");
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Link 
        href="/templates" 
        className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Templates
      </Link>

      <Card className="bg-[#0c0c1a] border-white/5 shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Wand2 className="h-24 w-24 text-indigo-500" />
        </div>

        <CardHeader className="border-b border-white/5 pb-8">
          <CardTitle className="text-3xl font-bold">New Template</CardTitle>
          <CardDescription className="text-white/40 text-lg">
            Give your template a name and choose the rendering type.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-white/70">
                Template Name
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g. Instagram Story Advertisement"
                required
                className="bg-white/5 border-white/10 h-12 text-lg focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-white/70">
                Rendering Type
              </Label>
              <Select name="type" defaultValue="image">
                <SelectTrigger className="bg-white/5 border-white/10 h-14">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-[#121225] border-white/10 text-white">
                  <SelectItem value="image" className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <ImageIcon className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-medium">Static Image</p>
                        <p className="text-[10px] text-white/40">PNG/JPEG exports (fast)</p>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="video" className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                        <Video className="h-5 w-5 text-indigo-400" />
                      </div>
                      <div>
                        <p className="font-medium">Animated Video</p>
                        <p className="text-[10px] text-white/40">MP4 export using FFmpeg.wasm</p>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 h-14 text-lg font-bold shadow-lg shadow-indigo-500/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-3" />
                    Initializing Workspace...
                  </>
                ) : (
                  "Create & Start Designing"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

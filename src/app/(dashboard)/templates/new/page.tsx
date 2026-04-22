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
  const [dimensions, setDimensions] = useState({ width: 1200, height: 630 });

  const PRESETS = [
    { name: "Instagram Story", width: 1080, height: 1920 },
    { name: "Instagram Post", width: 1080, height: 1080 },
    { name: "YouTube Thumbnail", width: 1280, height: 720 },
    { name: "Full HD Video", width: 1920, height: 1080 },
    { name: "Facebook Post", width: 1200, height: 630 },
  ];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    // Ensure accurate dimensions are sent
    formData.set("width", dimensions.width.toString());
    formData.set("height", dimensions.height.toString());

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
    <div className="p-8 max-w-2xl mx-auto pb-24">
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
                placeholder="e.g. Ad Campaign #1"
                required
                className="bg-white/5 border-white/10 h-12 text-lg focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-white/70">
                  Type
                </Label>
                <Select name="type" defaultValue="image">
                  <SelectTrigger className="bg-white/5 border-white/10 h-12">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#121225] border-white/10 text-white">
                    <SelectItem value="image">Static Image</SelectItem>
                    <SelectItem value="video">Animated Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-white/70">
                  Size Preset
                </Label>
                <Select 
                  onValueChange={(val) => {
                    if (val === "custom") return;
                    const preset = PRESETS.find(p => p.name === val);
                    if (preset) setDimensions({ width: preset.width, height: preset.height });
                  }}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 h-12">
                    <SelectValue placeholder="Social Presets" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#121225] border-white/10 text-white">
                    {PRESETS.map((p) => (
                      <SelectItem key={p.name} value={p.name}>
                        {p.name} ({p.width}x{p.height})
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom Size</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                  <Label className="text-xs text-white/40 uppercase tracking-widest">Width (px)</Label>
                  <Input 
                    type="number"
                    value={dimensions.width}
                    onChange={(e) => setDimensions({ ...dimensions, width: parseInt(e.target.value) || 0 })}
                    className="bg-white/5 border-white/10 h-12 font-mono text-indigo-400"
                  />
               </div>
               <div className="space-y-2">
                  <Label className="text-xs text-white/40 uppercase tracking-widest">Height (px)</Label>
                  <Input 
                    type="number"
                    value={dimensions.height}
                    onChange={(e) => setDimensions({ ...dimensions, height: parseInt(e.target.value) || 0 })}
                    className="bg-white/5 border-white/10 h-12 font-mono text-indigo-400"
                  />
               </div>
            </div>

            <div className="pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 h-14 text-lg font-bold shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all"
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

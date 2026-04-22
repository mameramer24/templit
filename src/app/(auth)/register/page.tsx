"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers, Loader2, UserPlus } from "lucide-react";
import { registerAction } from "@/app/actions/auth-actions";
import { toast } from "sonner";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    try {
      await registerAction(formData);
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a14] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md space-y-8 z-10">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Layers className="h-7 w-7 text-white" />
            </div>
            <span className="text-3xl font-black tracking-tighter text-white">templit</span>
          </Link>
          <h2 className="mt-6 text-3xl font-extrabold text-white">Create an account</h2>
          <p className="mt-2 text-sm text-white/40">
            Start rendering vibrant images and videos today.
          </p>
        </div>

        <Card className="bg-white/5 border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-gradient-x" />
          
          <CardHeader>
            <CardTitle className="text-white">Sign Up</CardTitle>
            <CardDescription className="text-white/40">
              Enter your details to create your workspace.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white/70">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Ahmad Ali"
                  required
                  className="bg-white/5 border-white/10 text-white focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/70">Email address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                  className="bg-white/5 border-white/10 text-white focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" dir="ltr" className="text-white/70 text-right">Password / كلمة السر</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="bg-white/5 border-white/10 text-white focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-6 rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98]"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <UserPlus className="h-5 w-5 mr-2" />
                )}
                {loading ? "Creating account..." : "Join Templit"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm">
              <p className="text-white/40">
                Already have an account?{" "}
                <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                  Sign in here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-white/20">
          By joining, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

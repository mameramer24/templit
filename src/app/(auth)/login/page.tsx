"use client";

/**
 * Login page — /login
 * Uses NextAuth.js v5 signIn() with the Credentials provider.
 */

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Layers, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password. Please try again.");
      } else {
        router.push("/templates");
        router.refresh();
      }
    });
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center p-4">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-transparent to-purple-950/30 pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Layers className="h-5 w-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">
            templit
          </span>
        </div>

        {/* Card */}
        <div className="bg-[#16162a] border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/40 backdrop-blur-sm">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-white">Welcome back</h1>
            <p className="text-sm text-white/50 mt-1">
              Sign in to your workspace
            </p>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5">
              <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-xs text-white/60 uppercase tracking-wide"
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-indigo-500 focus:ring-indigo-500/20 h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-xs text-white/60 uppercase tracking-wide"
              >
                Password
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-indigo-500 focus:ring-indigo-500/20 h-11"
              />
            </div>

            <Button
              id="login-submit-btn"
              type="submit"
              disabled={isPending}
              className="w-full h-11 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium shadow-lg shadow-indigo-500/20 mt-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-white/30">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Request access
            </Link>
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-white/20">
          © {new Date().getFullYear()} Templit. All rights reserved.
        </p>
      </div>
    </div>
  );
}

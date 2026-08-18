"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/client";
import { toast } from "sonner";
import { Button } from "@attendly/ui/components";
import { Input } from "@attendly/ui/components";
import { PageTransition } from "@attendly/ui/components";
import { Mail, Lock, Check, ArrowRight } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") ?? "";
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    const redirect = searchParams.get("redirect");
    const dest = redirect && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/dashboard";
    router.push(dest);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      {/* Left branded panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-12 text-white relative overflow-hidden [background:linear-gradient(140deg,#6a2cc0_0%,#c4206e_55%,#d06a28_100%)]">
        {/* Decorative elements */}
        <div className="absolute top-20 right-16 h-64 w-64 rounded-full bg-white/5 blur-xl" />
        <div className="absolute bottom-32 right-32 h-40 w-40 rounded-full bg-white/[0.07] blur-lg" />
        <div className="absolute bottom-16 left-8 h-32 w-32 rounded-full bg-white/[0.04] blur-xl" />

        <div className="max-w-md space-y-8 relative z-10 [text-shadow:0_1px_2px_rgba(0,0,0,0.2)]">
          <span className="inline-block rounded-lg bg-black/25 px-5 py-2 text-[72px] font-[800] tracking-[-0.05em] leading-none backdrop-blur-sm">
            <span>EVEN</span><span className="bg-[image:linear-gradient(100deg,#ff2f92,#ff8a3d)] bg-clip-text text-transparent">TRIV</span>
          </span>
          <div className="space-y-4">
            <h2 className="text-4xl font-[800] leading-tight tracking-[-0.03em]">
              Your events,<br />under control.
            </h2>
            <p className="text-lg text-white/90 leading-relaxed">
              Registrations, check-ins, schedules, and attendee comms — one dashboard, zero spreadsheets.
            </p>
          </div>
          <ul className="space-y-3">
            {["Launch an event in under 5 minutes", "QR check-in at the door", "See who registered, in real time"].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-white/80">
                <span className="flex h-5 w-5 items-center justify-center rounded-[2px] bg-white/20">
                  <Check className="h-3 w-3" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center px-4 bg-white text-zinc-900 theme-light">
        <PageTransition>
          <div className="w-full max-w-sm space-y-6">
            {/* Mobile logo */}
            <div className="lg:hidden flex justify-center mb-4">
              <span className="text-[24px] font-[800] tracking-[-0.04em]">
                <span className="text-foreground">EVEN</span>
                <span className="gradient-brand-text">TRIV</span>
              </span>
            </div>

            <div className="space-y-2 text-center lg:text-left">
              <div className="flex gap-1 justify-center lg:justify-start mb-3">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                <span className="h-1.5 w-8 rounded-full bg-brand-pink/25" />
                <span className="h-1.5 w-1.5 rounded-full bg-brand-orange/40" />
              </div>
              <h1 className="text-2xl font-bold">Welcome back</h1>
              <p className="text-sm text-muted-foreground">
                Sign in to your account
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="flex items-center gap-1.5 text-sm font-medium">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="flex items-center gap-1.5 text-sm font-medium">
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    Password
                  </label>
                  <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {/* Remember me */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30 bg-background"
                />
                <span className="text-sm text-muted-foreground">Remember me</span>
              </label>

              <Button type="submit" loading={loading} className="w-full group">
                {loading ? "Signing in..." : (
                  <span className="flex items-center justify-center gap-2">
                    Sign in
                    <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                  </span>
                )}
              </Button>
            </form>

            <div className="rounded-md border border-border bg-muted/50 p-4 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href={`/signup${searchParams.get("redirect") ? `?redirect=${encodeURIComponent(searchParams.get("redirect")!)}` : ""}`} className="text-brand-pink font-semibold hover:underline">
                Sign up for free
              </Link>
            </div>
          </div>
        </PageTransition>
      </div>
    </div>
  );
}

"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/shared/utils/supabase/client";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { PageTransition } from "@/shared/components/ui/page-transition";
import { Logo } from "@/shared/components/logo";
import { Mail, Lock, Check, ArrowRight } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

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
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-12 text-primary-foreground relative overflow-hidden">
        {/* Floating decorative shapes */}
        <div className="absolute top-20 right-16 h-64 w-64 rounded-full bg-white/5 animate-[float_20s_ease-in-out_infinite]" />
        <div className="absolute bottom-32 right-32 h-40 w-40 rounded-full bg-white/[0.07] animate-[float_15s_ease-in-out_infinite_reverse]" />
        <div className="absolute top-1/2 right-8 h-20 w-20 rounded-full bg-info/10 animate-[float_12s_ease-in-out_infinite]" />
        <div className="absolute bottom-16 left-8 h-32 w-32 rounded-full bg-white/[0.04] animate-[float_18s_ease-in-out_infinite_reverse]" />

        <div className="max-w-md space-y-8 relative z-10">
          <Logo size="xl" variant="white" />
          <div className="space-y-4">
            <h2 className="text-4xl font-bold font-serif leading-tight">
              Events that bring<br />people together.
            </h2>
            <p className="text-lg text-primary-foreground/80">
              Create, manage, and grow your events with a platform designed for modern organizers.
            </p>
          </div>
          <ul className="space-y-3">
            {["Free to get started", "No credit card required", "Cancel anytime"].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-primary-foreground/70">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/15">
                  <Check className="h-3 w-3" />
                </span>
                {item}
              </li>
            ))}
          </ul>
          <p className="text-sm text-primary-foreground/60">
            Trusted by organizers worldwide
          </p>
        </div>

        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            33% { transform: translateY(-15px) rotate(1deg); }
            66% { transform: translateY(10px) rotate(-1deg); }
          }
        `}</style>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center px-4">
        <PageTransition>
          <div className="w-full max-w-sm space-y-6">
            {/* Mobile logo */}
            <div className="lg:hidden flex justify-center mb-4">
              <Logo size="lg" />
            </div>

            <div className="space-y-2 text-center lg:text-left">
              {/* Decorative dots */}
              <div className="flex gap-1 justify-center lg:justify-start mb-3">
                <span className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                <span className="h-1.5 w-8 rounded-full bg-primary/25" />
                <span className="h-1.5 w-1.5 rounded-full bg-primary/40" />
              </div>
              <h1 className="text-2xl font-semibold">Welcome back</h1>
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
                  <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
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
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
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

            <div className="rounded-xl border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-primary font-semibold hover:underline">
                Sign up for free
              </Link>
            </div>
          </div>
        </PageTransition>
      </div>
    </div>
  );
}

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
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-12 text-primary-foreground">
        <div className="max-w-md space-y-8">
          <Logo size="xl" variant="white" />
          <div className="space-y-4">
            <h2 className="text-4xl font-bold font-serif leading-tight">
              Events that bring<br />people together.
            </h2>
            <p className="text-lg text-primary-foreground/80">
              Create, manage, and grow your events with a platform designed for modern organizers.
            </p>
          </div>
          <p className="text-sm text-primary-foreground/60">
            Trusted by organizers worldwide
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center px-4">
        <PageTransition>
          <div className="w-full max-w-sm space-y-6">
            <div className="space-y-2 text-center lg:text-left">
              <h1 className="text-2xl font-semibold">Welcome back</h1>
              <p className="text-sm text-muted-foreground">
                Sign in to your account
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
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
                  <label htmlFor="password" className="text-sm font-medium">
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

              <Button type="submit" loading={loading} className="w-full">
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>

            <div className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-primary font-medium hover:underline">
                Sign up
              </Link>
            </div>
          </div>
        </PageTransition>
      </div>
    </div>
  );
}

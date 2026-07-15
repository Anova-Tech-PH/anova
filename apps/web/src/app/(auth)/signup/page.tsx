"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/shared/utils/supabase/client";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { PageTransition } from "@/shared/components/ui/page-transition";
import { Logo } from "@/shared/components/logo";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // Auto-create organization for new users
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const orgSlug = fullName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      // Append short random suffix to prevent slug collisions
      const suffix = Math.random().toString(36).slice(2, 6);
      const { error: rpcError } = await supabase.rpc("create_organization_with_owner", {
        _name: `${fullName}'s Events`,
        _slug: `${orgSlug}-${suffix}`,
      });

      if (rpcError) {
        console.error("Failed to create organization:", rpcError.message);
        toast.error("Account created but organization setup failed. Please contact support.");
      }
    }

    router.push("/dashboard");
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
              Start something<br />unforgettable.
            </h2>
            <p className="text-lg text-primary-foreground/80">
              From intimate workshops to large conferences, Anova gives you everything you need.
            </p>
          </div>
          <p className="text-sm text-primary-foreground/60">
            Free to get started
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center px-4">
        <PageTransition>
          <div className="w-full max-w-sm space-y-6">
            <div className="space-y-2 text-center lg:text-left">
              <h1 className="text-2xl font-semibold">Create your account</h1>
              <p className="text-sm text-muted-foreground">
                Start managing events in minutes
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="fullName" className="text-sm font-medium">
                  Full name
                </label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Jane Smith"
                />
              </div>

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
                <label htmlFor="password" className="text-sm font-medium">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                />
              </div>

              <Button type="submit" loading={loading} className="w-full">
                {loading ? "Creating account..." : "Create account"}
              </Button>
            </form>

            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </div>
          </div>
        </PageTransition>
      </div>
    </div>
  );
}

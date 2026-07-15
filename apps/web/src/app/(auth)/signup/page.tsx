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
import { User, Mail, Lock, ArrowRight, Users } from "lucide-react";

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
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-12 text-primary-foreground relative overflow-hidden">
        {/* Floating decorative shapes */}
        <div className="absolute top-16 right-24 h-48 w-48 rounded-full bg-white/[0.06] animate-[float_18s_ease-in-out_infinite]" />
        <div className="absolute bottom-24 right-12 h-56 w-56 rounded-full bg-white/[0.04] animate-[float_22s_ease-in-out_infinite_reverse]" />
        <div className="absolute top-1/3 right-40 h-24 w-24 rounded-full bg-info/10 animate-[float_14s_ease-in-out_infinite]" />
        <div className="absolute bottom-40 left-4 h-16 w-16 rounded-full bg-white/[0.08] animate-[float_16s_ease-in-out_infinite_reverse]" />
        <div className="absolute top-12 left-1/2 h-12 w-12 rounded-full bg-white/[0.05] animate-[float_10s_ease-in-out_infinite]" />

        <div className="max-w-md space-y-8 relative z-10">
          <Logo size="xl" variant="white" />
          <div className="space-y-4">
            <h2 className="text-4xl font-bold font-serif leading-tight">
              Start something<br />unforgettable.
            </h2>
            <p className="text-lg text-primary-foreground/80">
              From intimate workshops to large conferences, Anova gives you everything you need.
            </p>
          </div>
          {/* Social proof */}
          <div className="flex items-center gap-3 text-primary-foreground/70">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-primary-foreground/90">Join 2,000+ organizers</p>
              <p className="text-xs text-primary-foreground/60">who trust Anova for their events</p>
            </div>
          </div>
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
                <span className="h-1.5 w-6 rounded-full bg-primary/25" />
                <span className="h-1.5 w-3 rounded-full bg-primary/30" />
                <span className="h-1.5 w-1.5 rounded-full bg-primary/40" />
              </div>
              <h1 className="text-2xl font-semibold">Create your account</h1>
              <p className="text-sm text-muted-foreground">
                Start managing events in minutes
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="fullName" className="flex items-center gap-1.5 text-sm font-medium">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
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
                <label htmlFor="password" className="flex items-center gap-1.5 text-sm font-medium">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
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
                {/* Password strength indicator */}
                {password.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      <div className={`h-1 flex-1 rounded-full transition-colors ${
                        password.length >= 1 ? (password.length >= 8 ? "bg-green-500" : password.length >= 6 ? "bg-yellow-500" : "bg-red-500") : "bg-muted"
                      }`} />
                      <div className={`h-1 flex-1 rounded-full transition-colors ${
                        password.length >= 6 ? (password.length >= 8 ? "bg-green-500" : "bg-yellow-500") : "bg-muted"
                      }`} />
                      <div className={`h-1 flex-1 rounded-full transition-colors ${
                        password.length >= 8 ? "bg-green-500" : "bg-muted"
                      }`} />
                    </div>
                    <p className={`text-xs ${
                      password.length >= 8 ? "text-green-600" : password.length >= 6 ? "text-yellow-600" : "text-red-500"
                    }`}>
                      {password.length >= 8 ? "Strong password" : password.length >= 6 ? "Could be stronger" : "Too short"}
                    </p>
                  </div>
                )}
              </div>

              <Button type="submit" loading={loading} className="w-full group">
                {loading ? "Creating account..." : (
                  <span className="flex items-center justify-center gap-2">
                    Create account
                    <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                  </span>
                )}
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground/70">
              By creating an account, you agree to our{" "}
              <span className="underline cursor-pointer hover:text-muted-foreground">Terms of Service</span>{" "}
              and{" "}
              <span className="underline cursor-pointer hover:text-muted-foreground">Privacy Policy</span>
            </p>

            <div className="rounded-xl border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-semibold hover:underline">
                Sign in
              </Link>
            </div>
          </div>
        </PageTransition>
      </div>
    </div>
  );
}

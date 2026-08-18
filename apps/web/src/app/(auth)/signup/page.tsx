"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/client";
import { toast } from "sonner";
import { Button } from "@attendly/ui/components";
import { Input } from "@attendly/ui/components";
import { PageTransition } from "@attendly/ui/components";
import { Logo } from "@attendly/ui/logo";
import { User, Mail, Lock, ArrowRight, Users } from "lucide-react";

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") ?? "";
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, first_name: firstName.trim(), last_name: lastName.trim() },
      },
    });

    if (error) {
      if (error.message === "User already registered") {
        // Account exists — try signing in instead
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          toast.error("An account with this email already exists. Please sign in instead.", {
            action: {
              label: "Go to Login",
              onClick: () => {
                const redirect = searchParams.get("redirect");
                router.push(`/login${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""}`);
              },
            },
          });
          setLoading(false);
          return;
        }
        toast.success("Signed in successfully!");
      } else {
        toast.error(error.message);
        setLoading(false);
        return;
      }
    }

    const redirect = searchParams.get("redirect");
    const dest = redirect && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/my-events";
    router.push(dest);
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
              Stop juggling<br />spreadsheets.
            </h2>
            <p className="text-lg text-primary-foreground/80 leading-relaxed">
              One place for tickets, schedules, speakers, and check-ins. Built for organizers who run 2–200 events a year.
            </p>
          </div>
          {/* Social proof */}
          <div className="flex items-center gap-3 text-primary-foreground/70">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-primary-foreground/90">Join 2,000+ organizers</p>
              <p className="text-xs text-primary-foreground/60">run their events on Evenstry</p>
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
                Join events or start organizing
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label htmlFor="firstName" className="flex items-center gap-1.5 text-sm font-medium">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    First name
                  </label>
                  <Input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    placeholder="Jane"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="lastName" className="text-sm font-medium">
                    Last name
                  </label>
                  <Input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    placeholder="Smith"
                  />
                </div>
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

            <div className="rounded-lg border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href={`/login${searchParams.get("redirect") ? `?redirect=${encodeURIComponent(searchParams.get("redirect")!)}` : ""}`} className="text-primary font-semibold hover:underline">
                Sign in
              </Link>
            </div>
          </div>
        </PageTransition>
      </div>
    </div>
  );
}

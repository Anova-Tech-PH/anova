"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/client";
import { toast } from "sonner";
import { Button } from "@attendly/ui/components";
import { Input } from "@attendly/ui/components";
import { PageTransition } from "@attendly/ui/components";
import { User, Mail, Lock, ArrowRight, Users, Eye, EyeOff } from "lucide-react";

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
  const [showPassword, setShowPassword] = useState(false);

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
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-12 text-white relative overflow-hidden [background:linear-gradient(140deg,#6a2cc0_0%,#c4206e_55%,#d06a28_100%)]">
        <div className="absolute top-16 right-24 h-48 w-48 rounded-full bg-white/5 blur-xl" />
        <div className="absolute bottom-24 right-12 h-56 w-56 rounded-full bg-white/[0.04] blur-lg" />
        <div className="absolute bottom-40 left-4 h-16 w-16 rounded-full bg-white/[0.08] blur-xl" />

        <div className="max-w-md space-y-8 relative z-10 [text-shadow:0_1px_2px_rgba(0,0,0,0.2)]">
          <span className="inline-block rounded-lg bg-black/25 px-5 py-2 text-[72px] font-[800] tracking-[-0.05em] leading-none backdrop-blur-sm"><span>EVEN</span><span className="bg-[image:linear-gradient(100deg,#ff2f92,#ff8a3d)] bg-clip-text text-transparent">TRIV</span></span>
          <div className="space-y-4">
            <h2 className="text-4xl font-[800] leading-tight tracking-[-0.03em]">
              Stop juggling<br />spreadsheets.
            </h2>
            <p className="text-lg text-white/90 leading-relaxed">
              One place for tickets, schedules, speakers, and check-ins. Built for organizers who run 2–200 events a year.
            </p>
          </div>
          <div className="flex items-center gap-3 text-white/80">
            <div className="flex h-9 w-9 items-center justify-center rounded-[2px] bg-white/20">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-white/90">Join 2,000+ organizers</p>
              <p className="text-xs text-white/70">run their events on Eventriv</p>
            </div>
          </div>
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
                <span className="h-1.5 w-6 rounded-full bg-brand-pink/25" />
                <span className="h-1.5 w-3 rounded-full bg-brand-orange/30" />
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
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="At least 8 characters"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
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

            <div className="rounded-md border border-border bg-muted/50 p-4 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href={`/login${searchParams.get("redirect") ? `?redirect=${encodeURIComponent(searchParams.get("redirect")!)}` : ""}`} className="text-brand-pink font-semibold hover:underline">
                Sign in
              </Link>
            </div>
          </div>
        </PageTransition>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/shared/utils/supabase/client";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Card } from "@/shared/components/ui/card";
import { PageTransition } from "@/shared/components/ui/page-transition";
import { MailCheck, Mail, KeyRound, ArrowRight, ArrowLeft } from "lucide-react";
import { Logo } from "@/shared/components/logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="flex min-h-screen">
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-12 text-primary-foreground relative overflow-hidden">
          {/* Floating decorative shapes */}
          <div className="absolute top-24 right-20 h-52 w-52 rounded-full bg-white/[0.05] animate-[float_17s_ease-in-out_infinite]" />
          <div className="absolute bottom-20 right-28 h-36 w-36 rounded-full bg-white/[0.07] animate-[float_21s_ease-in-out_infinite_reverse]" />
          <div className="absolute top-1/2 right-10 h-16 w-16 rounded-full bg-info/10 animate-[float_13s_ease-in-out_infinite]" />

          <div className="max-w-md space-y-8 relative z-10">
            <Logo size="xl" variant="white" />
            <h2 className="text-4xl font-bold font-serif leading-tight">
              We&apos;ve got<br />your back.
            </h2>
          </div>

          <style>{`
            @keyframes float {
              0%, 100% { transform: translateY(0px) rotate(0deg); }
              33% { transform: translateY(-15px) rotate(1deg); }
              66% { transform: translateY(10px) rotate(-1deg); }
            }
          `}</style>
        </div>
        <div className="flex flex-1 items-center justify-center px-4">
          <PageTransition>
            <Card className="w-full max-w-sm p-8">
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 animate-[scaleIn_0.4s_ease-out]">
                  <MailCheck className="h-7 w-7 text-primary" />
                </div>
                <h1 className="text-2xl font-semibold">Check your email</h1>
                <p className="text-sm text-muted-foreground">
                  We sent a password reset link to<br />
                  <span className="font-medium text-foreground">{email}</span>
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to login
                </Link>
              </div>
            </Card>
            <style>{`
              @keyframes scaleIn {
                0% { transform: scale(0.5); opacity: 0; }
                100% { transform: scale(1); opacity: 1; }
              }
            `}</style>
          </PageTransition>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left branded panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-12 text-primary-foreground relative overflow-hidden">
        {/* Floating decorative shapes */}
        <div className="absolute top-24 right-20 h-52 w-52 rounded-full bg-white/[0.05] animate-[float_17s_ease-in-out_infinite]" />
        <div className="absolute bottom-20 right-28 h-36 w-36 rounded-full bg-white/[0.07] animate-[float_21s_ease-in-out_infinite_reverse]" />
        <div className="absolute top-1/2 right-10 h-16 w-16 rounded-full bg-info/10 animate-[float_13s_ease-in-out_infinite]" />

        <div className="max-w-md space-y-8 relative z-10">
          <Logo size="xl" variant="white" />
          <div className="space-y-4">
            <h2 className="text-4xl font-bold font-serif leading-tight">
              We&apos;ve got<br />your back.
            </h2>
            <p className="text-lg text-primary-foreground/80">
              Happens to the best of us. We&apos;ll have you back in no time.
            </p>
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
                <span className="h-1.5 w-5 rounded-full bg-primary/25" />
                <span className="h-1.5 w-1.5 rounded-full bg-primary/40" />
              </div>
              <h1 className="flex items-center gap-2 text-2xl font-semibold justify-center lg:justify-start">
                <KeyRound className="h-5 w-5 text-primary" />
                Reset password
              </h1>
              <p className="text-sm text-muted-foreground">
                Enter your email to receive a reset link
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

              <Button type="submit" loading={loading} className="w-full group">
                {loading ? "Sending..." : (
                  <span className="flex items-center justify-center gap-2">
                    Send reset link
                    <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                  </span>
                )}
              </Button>
            </form>

            <div className="text-center text-sm text-muted-foreground">
              <Link href="/login" className="inline-flex items-center gap-1.5 text-primary font-medium hover:underline">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to login
              </Link>
            </div>
          </div>
        </PageTransition>
      </div>
    </div>
  );
}

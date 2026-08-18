"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@attendly/ui/supabase/client";
import { toast } from "sonner";
import { Button } from "@attendly/ui/components";
import { Input } from "@attendly/ui/components";
import { Card } from "@attendly/ui/components";
import { PageTransition } from "@attendly/ui/components";
import { MailCheck, Mail, KeyRound, ArrowRight, ArrowLeft } from "lucide-react";


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
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-12 text-white [background:linear-gradient(140deg,#6a2cc0_0%,#c4206e_55%,#d06a28_100%)] relative overflow-hidden">
          <div className="absolute top-24 right-20 h-52 w-52 rounded-full bg-white/5 blur-xl" />
          <div className="absolute bottom-20 right-28 h-36 w-36 rounded-full bg-white/[0.07] blur-lg" />

          <div className="max-w-md space-y-8 relative z-10">
            <span className="text-[32px] font-[800] tracking-[-0.04em]">EVENTRIV</span>
            <h2 className="text-4xl font-[800] leading-tight tracking-[-0.03em]">
              We&apos;ve got<br />your back.
            </h2>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center px-4 bg-white text-zinc-900 theme-light">
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
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center p-12 text-white [background:linear-gradient(140deg,#6a2cc0_0%,#c4206e_55%,#d06a28_100%)] relative overflow-hidden">
        {/* Floating decorative shapes */}
        <div className="absolute top-24 right-20 h-52 w-52 rounded-full bg-white/5 blur-xl" />
        <div className="absolute bottom-20 right-28 h-36 w-36 rounded-full bg-white/[0.07] blur-lg" />

        <div className="max-w-md space-y-8 relative z-10">
          <span className="text-[32px] font-[800] tracking-[-0.04em]">EVENTRIV</span>
          <div className="space-y-4">
            <h2 className="text-4xl font-[800] leading-tight tracking-[-0.03em]">
              We&apos;ve got<br />your back.
            </h2>
            <p className="text-lg text-white/90">
              Happens to the best of us. We&apos;ll have you back in no time.
            </p>
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

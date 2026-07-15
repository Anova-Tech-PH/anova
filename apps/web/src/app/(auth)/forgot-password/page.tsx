"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/shared/utils/supabase/client";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { PageTransition } from "@/shared/components/ui/page-transition";
import { MailCheck } from "lucide-react";
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
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-12 text-primary-foreground">
          <div className="max-w-md space-y-8">
            <Logo size="xl" variant="white" />
            <h2 className="text-4xl font-bold font-serif leading-tight">
              We&apos;ve got<br />your back.
            </h2>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center px-4">
          <PageTransition>
            <div className="w-full max-w-sm space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <MailCheck className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-2xl font-semibold">Check your email</h1>
              <p className="text-sm text-muted-foreground">
                We sent a password reset link to {email}
              </p>
              <Link href="/login" className="text-sm text-primary font-medium hover:underline">
                Back to login
              </Link>
            </div>
          </PageTransition>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Left branded panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-12 text-primary-foreground">
        <div className="max-w-md space-y-8">
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
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center px-4">
        <PageTransition>
          <div className="w-full max-w-sm space-y-6">
            <div className="space-y-2 text-center lg:text-left">
              <h1 className="text-2xl font-semibold">Reset password</h1>
              <p className="text-sm text-muted-foreground">
                Enter your email to receive a reset link
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

              <Button type="submit" loading={loading} className="w-full">
                {loading ? "Sending..." : "Send reset link"}
              </Button>
            </form>

            <div className="text-center text-sm text-muted-foreground">
              <Link href="/login" className="text-primary font-medium hover:underline">
                Back to login
              </Link>
            </div>
          </div>
        </PageTransition>
      </div>
    </div>
  );
}

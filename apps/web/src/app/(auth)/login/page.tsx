"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/client";
import { toast } from "sonner";
import { Button } from "@attendly/ui/components";
import { Input } from "@attendly/ui/components";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

const steps = [
  {
    number: "01",
    title: "Pick a template",
    description: "Tickets, form and schedule arrive with it",
  },
  {
    number: "02",
    title: "Share the page",
    description: "Two fields to register, pass on the phone",
  },
  {
    number: "03",
    title: "Open door mode",
    description: "Volunteers scan, the count moves live",
  },
];

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
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-ink p-12 min-h-screen">
        {/* Top — wordmark */}
        <div>
          <span className="font-display text-[22px] font-extrabold uppercase tracking-[-0.03em] text-white">
            EVENSTRY
          </span>
        </div>

        {/* Middle — headline + steps */}
        <div>
          <h1 className="font-display text-[46px] font-extrabold text-white max-w-[20ch] leading-[1.02]">
            One screen. Every gathering.
          </h1>

          <div className="flex flex-col gap-6 mt-10">
            {steps.map((step) => (
              <div key={step.number} className="flex gap-4 items-start">
                <span className="font-display text-[15px] font-extrabold text-accent w-5">
                  {step.number}
                </span>
                <div>
                  <p className="text-[15px] font-semibold text-white">
                    {step.title}
                  </p>
                  <p className="text-[13px] text-white/60 mt-1">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom — early access note */}
        <div>
          <p className="text-[12px] font-bold tracking-[0.14em] uppercase text-white/40">
            FREE WHILE IN EARLY ACCESS
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center bg-card">
        <div className="max-w-[380px] w-full px-4">
          {/* Mobile wordmark */}
          <div className="lg:hidden mb-8">
            <span className="font-display text-[22px] font-extrabold uppercase tracking-[-0.03em]">
              EVENSTRY
            </span>
          </div>

          <h1 className="font-display text-[32px] font-extrabold">Sign in</h1>
          <p className="text-[14px] text-muted-strong mt-1">
            Welcome back to Grace Chapel.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="text-[12px] font-bold uppercase tracking-[0.06em] text-muted-foreground mb-2 block"
              >
                EMAIL
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

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="password"
                  className="text-[12px] font-bold uppercase tracking-[0.06em] text-muted-foreground"
                >
                  PASSWORD
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[12px] font-semibold text-primary"
                >
                  Forgot?
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

            {/* Submit */}
            <Button
              type="submit"
              loading={loading}
              className="w-full py-[14px] text-[15px] font-bold"
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-5">
            <hr className="flex-1 border-border-subtle" />
            <span className="text-[13px] text-muted-foreground">or</span>
            <hr className="flex-1 border-border-subtle" />
          </div>

          {/* Google button */}
          <button
            type="button"
            className="border-[1.5px] border-border rounded-[6px] py-[14px] w-full text-[14px] font-semibold"
          >
            Continue with Google
          </button>

          {/* Sign up link */}
          <p className="text-[14px] text-muted-foreground mt-5 text-center">
            New here?{" "}
            <Link href="/signup" className="text-primary font-semibold">
              Create an organisation
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

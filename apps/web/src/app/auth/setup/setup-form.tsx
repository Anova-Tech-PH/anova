"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Lock, ArrowRight } from "lucide-react";
import { Button, Input } from "@attendly/ui/components";
import { Logo } from "@attendly/ui/logo";
import { createAttendeeAccount } from "@/features/attendee/actions";

export function SetupForm({
  email,
  redirectTo,
}: {
  email: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await createAttendeeAccount({
        email,
        password,
        fullName: email.split("@")[0],
      });
      toast.success("Account created! Redirecting...");
      const dest = redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("//")
        ? redirectTo
        : "/my-events";
      router.push(dest);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      if (message === "User already registered" || message.includes("already")) {
        // Race condition — account was created between page load and submit
        const loginParams = new URLSearchParams();
        loginParams.set("email", email);
        if (redirectTo) loginParams.set("redirect", redirectTo);
        router.push(`/login?${loginParams.toString()}`);
      } else {
        toast.error(message);
      }
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="flex justify-center">
        <Logo size="lg" />
      </div>

      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold">Set up your account</h1>
        <p className="text-sm text-muted-foreground">
          Create a password to access your events
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Email
          </label>
          <Input type="email" value={email} disabled className="bg-muted" />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="password"
            className="flex items-center gap-1.5 text-sm font-medium"
          >
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
            Password
          </label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            autoFocus
          />
        </div>

        <Button type="submit" loading={loading} className="w-full group">
          {loading ? (
            "Creating account..."
          ) : (
            <span className="flex items-center justify-center gap-2">
              Create account & continue
              <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
            </span>
          )}
        </Button>
      </form>
    </div>
  );
}

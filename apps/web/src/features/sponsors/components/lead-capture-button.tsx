"use client";

import { useState, useEffect } from "react";
import { createClient } from "@attendly/ui/supabase/client";
import { submitLead } from "@/features/sponsors/actions";
import { LogIn, CheckCircle, Share2 } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type LeadCaptureButtonProps = {
  sponsorId: string;
  eventId: string;
  sponsorName: string;
};

export function LeadCaptureButton({
  sponsorId,
  eventId,
  sponsorName,
}: LeadCaptureButtonProps) {
  const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email ?? "",
          name: data.user.user_metadata?.full_name ?? data.user.email ?? "",
        });
      }
      setLoading(false);
    });
  }, []);

  async function handleSubmit() {
    if (!user || submitting || submitted) return;

    setSubmitting(true);
    try {
      await submitLead(sponsorId, eventId, {
        name: user.name,
        email: user.email,
      });
      setSubmitted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      // Handle duplicate gracefully
      if (
        message.includes("duplicate") ||
        message.includes("unique") ||
        message.includes("already")
      ) {
        setSubmitted(true);
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return null;

  if (!user) {
    return (
      <Link
        href={`/login?redirect=${encodeURIComponent(pathname)}`}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
      >
        <LogIn className="h-4 w-4" />
        Sign in to share contact
      </Link>
    );
  }

  if (submitted) {
    return (
      <button
        disabled
        className="flex w-full items-center justify-center gap-2 rounded-lg border bg-muted px-4 py-3 text-sm font-medium text-muted-foreground"
      >
        <CheckCircle className="h-4 w-4" />
        Contact shared
      </button>
    );
  }

  return (
    <button
      onClick={handleSubmit}
      disabled={submitting}
      className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
    >
      <Share2 className="h-4 w-4" />
      {submitting ? "Sharing..." : `Share my contact with ${sponsorName}`}
    </button>
  );
}

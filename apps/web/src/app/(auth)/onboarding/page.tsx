"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/shared/utils/supabase/client";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Card } from "@/shared/components/ui/card";
import { PageTransition } from "@/shared/components/ui/page-transition";
import { Logo } from "@/shared/components/logo";
import {
  Building2,
  Sparkles,
  Plus,
  ArrowRight,
  CalendarDays,
  Users,
  Ticket,
  Mic,
} from "lucide-react";

export default function OnboardingPage() {
  const [orgName, setOrgName] = useState("");
  const [seedDemo, setSeedDemo] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgName.trim() || seedDemo === null) return;
    setLoading(true);

    try {
      const supabase = createClient();

      const slug =
        orgName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") +
        "-" +
        Math.random().toString(36).slice(2, 6);

      const { data: orgId, error: rpcError } = await supabase.rpc(
        "create_organization_with_owner",
        { _name: orgName, _slug: slug }
      );

      if (rpcError) throw rpcError;

      if (seedDemo && orgId) {
        const { error: seedError } = await supabase.rpc(
          "seed_demo_event_for_org",
          { _org_id: orgId }
        );
        if (seedError) {
          console.error("Failed to seed demo:", seedError.message);
        }
      }

      toast.success("You're all set!");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Setup failed. Please try again."
      );
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-primary/[0.03] px-4">
      <PageTransition>
        <div className="w-full max-w-lg space-y-8">
          <div className="flex justify-center">
            <Logo size="lg" />
          </div>

          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold">Welcome to Anova</h1>
            <p className="text-muted-foreground">
              Let's get your organization set up in under a minute.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 1: Organization name */}
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-sm font-medium">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                Organization name
              </label>
              <Input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
                placeholder="e.g. Acme Events, TechConf, My Company"
                className="h-12 text-base"
              />
              <p className="text-xs text-muted-foreground">
                This is the name attendees will see. You can change it later.
              </p>
            </div>

            {/* Step 2: Demo or fresh start */}
            <div className="space-y-3">
              <label className="text-sm font-medium">
                How would you like to start?
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setSeedDemo(true)}
                  className={`rounded-xl border-2 p-5 text-left transition-all ${
                    seedDemo === true
                      ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                      : "border-border hover:border-primary/30 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-3">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <p className="font-semibold text-sm">Start with demo event</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Get a pre-built event with speakers, sessions, tickets, and
                    sample registrations to explore the platform.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {[
                      { icon: CalendarDays, label: "4 sessions" },
                      { icon: Mic, label: "3 speakers" },
                      { icon: Ticket, label: "2 ticket types" },
                      { icon: Users, label: "3 registrations" },
                    ].map(({ icon: Icon, label }) => (
                      <span
                        key={label}
                        className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                      >
                        <Icon className="h-2.5 w-2.5" />
                        {label}
                      </span>
                    ))}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSeedDemo(false)}
                  className={`rounded-xl border-2 p-5 text-left transition-all ${
                    seedDemo === false
                      ? "border-primary bg-primary/5 ring-1 ring-primary shadow-sm"
                      : "border-border hover:border-primary/30 hover:bg-muted/30"
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted mb-3">
                    <Plus className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="font-semibold text-sm">Start from scratch</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    Jump straight into creating your first event. Best if you
                    already know what you're building.
                  </p>
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={!orgName.trim() || seedDemo === null}
              loading={loading}
              className="w-full h-12 text-base group"
            >
              {loading ? (
                "Setting up..."
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Get started
                  <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                </span>
              )}
            </Button>
          </form>
        </div>
      </PageTransition>
    </div>
  );
}

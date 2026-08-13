"use client";

import { useState, useTransition } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@attendly/ui/components";
import { Mail, TrendingUp, Clock, Send } from "lucide-react";
import { toast } from "sonner";
import { updateRecoverySettings } from "../recovery-actions";

type Props = {
  eventId: string;
  initialSettings: {
    recovery_enabled: boolean;
    recovery_delay_hours: number;
    recovery_email_count: number;
  };
  stats: {
    total: number;
    pending: number;
    converted: number;
    expired: number;
    emailsSent: number;
  };
};

const DELAY_OPTIONS = [
  { value: 1, label: "1 hour" },
  { value: 2, label: "2 hours" },
  { value: 4, label: "4 hours" },
  { value: 24, label: "24 hours" },
];

const EMAIL_COUNT_OPTIONS = [
  { value: 1, label: "1 email", description: "A single gentle reminder" },
  { value: 2, label: "2 emails", description: "Initial reminder + follow-up" },
  { value: 3, label: "3 emails", description: "Full recovery sequence with urgency" },
];

export function RecoverySettings({ eventId, initialSettings, stats }: Props) {
  const [enabled, setEnabled] = useState(initialSettings.recovery_enabled);
  const [delayHours, setDelayHours] = useState(initialSettings.recovery_delay_hours);
  const [emailCount, setEmailCount] = useState(initialSettings.recovery_email_count);
  const [isPending, startTransition] = useTransition();

  const hasChanges =
    enabled !== initialSettings.recovery_enabled ||
    delayHours !== initialSettings.recovery_delay_hours ||
    emailCount !== initialSettings.recovery_email_count;

  const conversionRate =
    stats.total > 0 ? ((stats.converted / stats.total) * 100).toFixed(1) : "0.0";

  function handleSave() {
    startTransition(async () => {
      try {
        await updateRecoverySettings(eventId, {
          recovery_enabled: enabled,
          recovery_delay_hours: delayHours,
          recovery_email_count: emailCount,
        });
        toast.success("Recovery settings saved");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save settings");
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Abandoned Registration Recovery</CardTitle>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              enabled ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${
                enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          Automatically send recovery emails to visitors who start but don&apos;t complete
          registration.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Stats cards */}
        {stats.total > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                Intents Captured
              </div>
              <p className="mt-1 text-2xl font-semibold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">
                {stats.pending} pending
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Send className="h-3.5 w-3.5" />
                Emails Sent
              </div>
              <p className="mt-1 text-2xl font-semibold">{stats.emailsSent}</p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" />
                Conversions
              </div>
              <p className="mt-1 text-2xl font-semibold">{stats.converted}</p>
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" />
                Conversion Rate
              </div>
              <p className="mt-1 text-2xl font-semibold">{conversionRate}%</p>
            </div>
          </div>
        )}

        {/* Settings (shown when enabled) */}
        {enabled && (
          <>
            {/* Delay selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                <Clock className="mr-1.5 inline-block h-4 w-4 text-muted-foreground" />
                Send first email after
              </label>
              <div className="flex flex-wrap gap-2">
                {DELAY_OPTIONS.map((opt) => (
                  <Button
                    key={opt.value}
                    variant={delayHours === opt.value ? "primary" : "outline"}
                    size="sm"
                    onClick={() => setDelayHours(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Email count selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                <Send className="mr-1.5 inline-block h-4 w-4 text-muted-foreground" />
                Number of recovery emails
              </label>
              <div className="flex flex-wrap gap-2">
                {EMAIL_COUNT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setEmailCount(opt.value)}
                    className={`rounded-lg border px-4 py-2 text-left transition-colors ${
                      emailCount === opt.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "hover:border-primary/50"
                    }`}
                  >
                    <span className="text-sm font-medium">{opt.label}</span>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Save button */}
        {hasChanges && (
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

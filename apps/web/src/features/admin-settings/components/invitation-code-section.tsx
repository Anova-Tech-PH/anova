"use client";

import { useState, useTransition } from "react";
import { Card, Input, Button } from "@attendly/ui/components";
import { KeyRound, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { setInvitationCode } from "../actions";

export function InvitationCodeSection({
  eventId,
  initialCode,
  initialRequired,
}: {
  eventId: string;
  initialCode: string | null;
  initialRequired: boolean;
}) {
  const [code, setCode] = useState(initialCode ?? "");
  const [required, setRequired] = useState(initialRequired);
  const [isPending, startTransition] = useTransition();

  function handleSetCode() {
    startTransition(async () => {
      try {
        await setInvitationCode(eventId, code.trim() || null, required);
        toast.success("Invitation code updated");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to update invitation code"
        );
      }
    });
  }

  function handleRequiredChange(checked: boolean) {
    setRequired(checked);
    startTransition(async () => {
      try {
        await setInvitationCode(eventId, code.trim() || null, checked);
        toast.success(
          checked
            ? "Invitation code is now required"
            : "Invitation code is no longer required"
        );
      } catch (err) {
        setRequired(!checked);
        toast.error(
          err instanceof Error ? err.message : "Failed to update setting"
        );
      }
    });
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-[oklch(0.445_0.107_195)]" />
          <h2 className="font-semibold">Invitation Code</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Set a code that attendees must enter to access this event. This helps
          protect your event&apos;s privacy and ensures only invited guests can
          join.
        </p>
      </div>

      <div className="space-y-4 px-6 py-4">
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Do not post this code on social media or any publicly accessible
            website.
          </span>
        </div>

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="mb-1.5 block text-sm font-medium">
              Invitation Code
            </label>
            <Input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter an invitation code"
              disabled={isPending}
            />
          </div>
          <Button onClick={handleSetCode} disabled={isPending}>
            {isPending ? "Saving..." : "Set Code"}
          </Button>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => handleRequiredChange(e.target.checked)}
            disabled={isPending}
            className="h-4 w-4 rounded border-border text-[oklch(0.445_0.107_195)] focus:ring-[oklch(0.445_0.107_195)]"
          />
          <span>
            Require invitation code to join this event{" "}
            <span className="text-muted-foreground">(Recommended)</span>
          </span>
        </label>
      </div>
    </Card>
  );
}

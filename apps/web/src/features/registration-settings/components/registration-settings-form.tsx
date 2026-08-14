"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Textarea, Card, useConfirm } from "@attendly/ui/components";
import { updateRegistrationSettings, removeFromWaitlist } from "../actions";
import type { RegistrationSettings } from "../queries";
import type { WaitlistEntry } from "../queries";

export function RegistrationSettingsForm({
  eventId,
  initialSettings,
  waitlistEntries: initialEntries,
}: {
  eventId: string;
  initialSettings: RegistrationSettings;
  waitlistEntries: WaitlistEntry[];
}) {
  const [settings, setSettings] = useState<RegistrationSettings>(initialSettings);
  const [entries, setEntries] = useState<WaitlistEntry[]>(initialEntries);
  const [saving, setSaving] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirm();

  function updateField<K extends keyof RegistrationSettings>(
    key: K,
    value: RegistrationSettings[K]
  ) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateRegistrationSettings(eventId, settings);
      toast.success("Registration settings saved");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save settings"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveEntry(entryId: string) {
    const ok = await confirm({
      title: "Remove from Waitlist",
      description: "Remove this person from the waitlist?",
      confirmLabel: "Remove",
    });
    if (!ok) return;
    try {
      await removeFromWaitlist(eventId, entryId);
      setEntries((prev) => prev.filter((e) => e.id !== entryId));
      toast.success("Removed from waitlist");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove"
      );
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="reg-open" className="text-sm font-medium">
              Registration Opens
            </label>
            <Input
              id="reg-open"
              type="datetime-local"
              value={settings.registration_open ?? ""}
              onChange={(e) => updateField("registration_open", e.target.value || undefined)}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reg-close" className="text-sm font-medium">
              Registration Closes
            </label>
            <Input
              id="reg-close"
              type="datetime-local"
              value={settings.registration_close ?? ""}
              onChange={(e) => updateField("registration_close", e.target.value || undefined)}
            />
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="capacity" className="text-sm font-medium">
              Capacity Limit
            </label>
            <Input
              id="capacity"
              type="number"
              min="1"
              placeholder="Unlimited"
              value={settings.capacity_limit ?? ""}
              onChange={(e) =>
                updateField(
                  "capacity_limit",
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
            />
            <p className="text-xs text-muted-foreground">
              Maximum number of registrations allowed.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-6">
            <input
              id="waitlist"
              type="checkbox"
              checked={settings.waitlist_enabled ?? false}
              onChange={(e) => updateField("waitlist_enabled", e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            <label htmlFor="waitlist" className="text-sm font-medium">
              Enable Waitlist
            </label>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="terms" className="text-sm font-medium">
            Terms and Conditions
          </label>
          <Textarea
            id="terms"
            rows={4}
            placeholder="Enter terms and conditions that registrants must agree to..."
            value={settings.terms_and_conditions ?? ""}
            onChange={(e) => updateField("terms_and_conditions", e.target.value || undefined)}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="closed-msg" className="text-sm font-medium">
            Registration Closed Message
          </label>
          <Textarea
            id="closed-msg"
            rows={3}
            placeholder="Message shown when registration is closed..."
            value={settings.registration_closed_message ?? ""}
            onChange={(e) =>
              updateField("registration_closed_message", e.target.value || undefined)
            }
          />
        </div>

        <Button type="submit" loading={saving}>
          Save Settings
        </Button>
      </form>

      {/* Waitlist Entries */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold">Waitlist Entries</h3>
          <p className="text-sm text-muted-foreground">
            {entries.length} {entries.length === 1 ? "person" : "people"} on the
            waitlist.
          </p>
        </div>

        {entries.length === 0 ? (
          <Card className="flex items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No one is on the waitlist yet.
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <Card key={entry.id} className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{entry.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Joined{" "}
                      {new Date(entry.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveEntry(entry.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {confirmDialog}
    </div>
  );
}

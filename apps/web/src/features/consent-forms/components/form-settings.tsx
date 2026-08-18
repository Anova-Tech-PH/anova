"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Globe, GlobeLock } from "lucide-react";
import { toast } from "sonner";
import { Button, Card, CardContent, Input } from "@attendly/ui/components";
import { updateConsentForm } from "../actions";
import type { ConsentForm } from "../queries";

interface FormSettingsProps {
  eventId: string;
  form: ConsentForm;
  formUrl: string | null;
}

const audienceOptions: { value: ConsentForm["audience"]; label: string }[] = [
  { value: "all", label: "All Participants" },
  { value: "attendees", label: "Attendees Only" },
  { value: "speakers", label: "Speakers Only" },
  { value: "volunteers", label: "Volunteers Only" },
];

export function FormSettings({ eventId, form, formUrl }: FormSettingsProps) {
  const router = useRouter();
  const [title, setTitle] = useState(form.title);
  const [audience, setAudience] = useState<ConsentForm["audience"]>(
    form.audience
  );
  const [description, setDescription] = useState(form.description ?? "");
  const [requireBeforeCheckin, setRequireBeforeCheckin] = useState(
    form.require_before_checkin
  );
  const [status, setStatus] = useState<ConsentForm["status"]>(form.status);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleCopyLink() {
    if (!formUrl) return;
    navigator.clipboard.writeText(formUrl);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleTogglePublish() {
    const newStatus = status === "published" ? "draft" : "published";
    startTransition(async () => {
      try {
        await updateConsentForm(eventId, form.id, { status: newStatus });
        setStatus(newStatus);
        toast.success(
          newStatus === "published" ? "Form published" : "Form unpublished"
        );
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to update status"
        );
      }
    });
  }

  function handleSave() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    startTransition(async () => {
      try {
        await updateConsentForm(eventId, form.id, {
          title: title.trim(),
          audience,
          description: description.trim() || null,
          require_before_checkin: requireBeforeCheckin,
        });
        toast.success("Settings saved");
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to save settings"
        );
      }
    });
  }

  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        <h3 className="text-base font-semibold">Form Settings</h3>

        <div>
          <label className="mb-1 block text-sm font-medium">Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Media Release Form"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Audience</label>
          <select
            value={audience}
            onChange={(e) =>
              setAudience(e.target.value as ConsentForm["audience"])
            }
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            {audienceOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Briefly describe what this form is for..."
            rows={3}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="require-checkin"
            checked={requireBeforeCheckin}
            onChange={(e) => setRequireBeforeCheckin(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="require-checkin" className="text-sm">
            Require signing before check-in
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t pt-4">
          <Button
            variant={status === "published" ? "outline" : "primary"}
            onClick={handleTogglePublish}
            disabled={isPending}
          >
            {status === "published" ? (
              <>
                <GlobeLock className="mr-2 h-4 w-4" />
                Unpublish
              </>
            ) : (
              <>
                <Globe className="mr-2 h-4 w-4" />
                Publish
              </>
            )}
          </Button>

          {status === "published" && formUrl && (
            <Button variant="outline" onClick={handleCopyLink}>
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Link
                </>
              )}
            </Button>
          )}

          <div className="flex-1" />

          <Button onClick={handleSave} disabled={isPending || !title.trim()}>
            {isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

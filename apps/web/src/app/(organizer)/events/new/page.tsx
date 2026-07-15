"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/shared/utils/supabase/client";
import { toast } from "sonner";
import { Input, Textarea, Button } from "@/shared/components/ui";

type Step = "basics" | "location" | "details";

export default function NewEventPage() {
  const [step, setStep] = useState<Step>("basics");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [form, setForm] = useState({
    title: "",
    slug: "",
    description: "",
    start_date: "",
    end_date: "",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    venue_name: "",
    venue_address: "",
    is_virtual: false,
    virtual_url: "",
    cover_image: "",
  });

  function updateForm(field: string, value: string | boolean) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "title"
        ? {
            slug: (value as string)
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)/g, ""),
          }
        : {}),
    }));
  }

  async function handleSubmit() {
    setLoading(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("You must be logged in");
      setLoading(false);
      return;
    }

    // Get user's organization
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("role", "owner")
      .single();

    if (!membership) {
      toast.error("No organization found");
      setLoading(false);
      return;
    }

    const { data: event, error } = await supabase
      .from("events")
      .insert({
        organization_id: membership.organization_id,
        title: form.title,
        slug: form.slug,
        description: form.description || null,
        start_date: new Date(form.start_date).toISOString(),
        end_date: new Date(form.end_date).toISOString(),
        timezone: form.timezone,
        venue_name: form.venue_name || null,
        venue_address: form.venue_address || null,
        is_virtual: form.is_virtual,
        virtual_url: form.virtual_url || null,
        cover_image: form.cover_image || null,
        status: "draft",
      })
      .select("id")
      .single();

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success("Event created!");
    router.push(`/events/${event.id}`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Create Event</h1>
        <p className="text-sm text-muted-foreground">
          Set up your event in a few steps.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex gap-2">
        {(["basics", "location", "details"] as Step[]).map((s, i) => (
          <div
            key={s}
            className={`flex h-8 flex-1 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
              step === s
                ? "bg-primary text-primary-foreground"
                : i < ["basics", "location", "details"].indexOf(step)
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </div>
        ))}
      </div>

      {/* Step: Basics */}
      {step === "basics" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Event name</label>
            <Input
              type="text"
              value={form.title}
              onChange={(e) => updateForm("title", e.target.value)}
              placeholder="My Awesome Conference"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">URL slug</label>
            <Input
              type="text"
              value={form.slug}
              onChange={(e) => updateForm("slug", e.target.value)}
              placeholder="my-awesome-conference"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start date</label>
              <Input
                type="datetime-local"
                value={form.start_date}
                onChange={(e) => updateForm("start_date", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End date</label>
              <Input
                type="datetime-local"
                value={form.end_date}
                onChange={(e) => updateForm("end_date", e.target.value)}
              />
            </div>
          </div>
          <Button
            onClick={() => setStep("location")}
            disabled={!form.title || !form.start_date || !form.end_date}
          >
            Next
          </Button>
        </div>
      )}

      {/* Step: Location */}
      {step === "location" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_virtual"
              checked={form.is_virtual}
              onChange={(e) => updateForm("is_virtual", e.target.checked)}
              className="rounded"
            />
            <label htmlFor="is_virtual" className="text-sm font-medium">
              This is a virtual event
            </label>
          </div>

          {form.is_virtual ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">Virtual event URL</label>
              <Input
                type="url"
                value={form.virtual_url}
                onChange={(e) => updateForm("virtual_url", e.target.value)}
                placeholder="https://zoom.us/j/..."
              />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Venue name</label>
                <Input
                  type="text"
                  value={form.venue_name}
                  onChange={(e) => updateForm("venue_name", e.target.value)}
                  placeholder="Convention Center"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Address</label>
                <Input
                  type="text"
                  value={form.venue_address}
                  onChange={(e) => updateForm("venue_address", e.target.value)}
                  placeholder="123 Main St, City, State"
                />
              </div>
            </>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("basics")}>
              Back
            </Button>
            <Button onClick={() => setStep("details")}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Step: Details */}
      {step === "details" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={form.description}
              onChange={(e) => updateForm("description", e.target.value)}
              rows={4}
              placeholder="Tell attendees about your event..."
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Cover image URL</label>
            <Input
              type="url"
              value={form.cover_image}
              onChange={(e) => updateForm("cover_image", e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("location")}>
              Back
            </Button>
            <Button
              onClick={handleSubmit}
              loading={loading}
            >
              {loading ? "Creating..." : "Create Event"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

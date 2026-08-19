"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/client";
import { toast } from "sonner";
import { Button } from "@attendly/ui/components";
import { Sparkles, LayoutTemplate } from "lucide-react";
import { EventBasicsForm } from "@/features/events/components/event-basics-form";
import type { EventFormData } from "@/features/events/components/event-basics-form";
import { createEventFromTemplate } from "@/features/templates/actions";

type Template = {
  id: string;
  name: string;
  description: string | null;
};

export default function NewEventPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [creatingFromTemplate, setCreatingFromTemplate] = useState<string | null>(null);
  const router = useRouter();
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: org } = await supabase
          .from("organizations")
          .select("id")
          .eq("slug", orgSlug)
          .single();
        if (!org) return;

        const { data, error } = await supabase
          .from("event_templates")
          .select("id, name, description")
          .eq("organization_id", org.id)
          .order("created_at", { ascending: false });

        if (!error && data && data.length > 0) {
          setTemplates(data);
        }
      } catch {
        // event_templates table may not exist yet
      }
    }
    fetchTemplates();
  }, [orgSlug]);

  async function handleCreateFromTemplate(templateId: string) {
    setCreatingFromTemplate(templateId);
    try {
      const result = await createEventFromTemplate(templateId, {
        title: "New Event (from template)",
        slug: `event-${Date.now()}`,
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 86400000).toISOString(),
      });
      toast.success("Event created from template");
      router.push(`/org/${orgSlug}/events/${result.id}/settings`);
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create from template"
      );
      setCreatingFromTemplate(null);
    }
  }

  async function handleCreate(data: EventFormData) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    const { data: org } = await supabase
      .from("organizations")
      .select("id")
      .eq("slug", orgSlug)
      .single();

    if (!org) {
      toast.error("Organization not found");
      return;
    }

    const slug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const { data: event, error } = await supabase
      .from("events")
      .insert({
        organization_id: org.id,
        title: data.title,
        slug,
        abbreviation: data.abbreviation || null,
        description: data.description || null,
        start_date: new Date(data.start_date).toISOString(),
        end_date: new Date(data.end_date).toISOString(),
        timezone: data.timezone,
        max_attendees: data.max_attendees || null,
        venue_name: data.location_data?.venue_name || null,
        venue_address: data.location_data?.formatted_address || null,
        location_data: data.location_data ?? {},
        welcome_message: data.welcome_message || null,
        airport_ride_sharing: data.airport_ride_sharing,
        event_website_url: data.event_website_url || null,
        logo: data.logo || null,
        cover_image: data.cover_image || null,
        twitter_hashtags: data.twitter_hashtags || null,
        post_event_summary: data.post_event_summary,
        generate_interests: data.generate_interests,
        organization_name: data.organization_name || null,
        attendee_origin: data.attendee_origin || null,
        topic_tags: data.topic_tags,
        organization_type: data.organization_type,
        event_type: data.event_type || null,
        event_type_other: data.event_type_other || null,
        is_virtual: false,
        status: "draft",
      })
      .select("id")
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Event created!");
    router.push(`/org/${orgSlug}/events/${event.id}`);
  }

  return (
    <div className="mx-auto max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Create Event</h1>
            <p className="text-sm text-muted-foreground">
              Fill in your event information below. You can come back and make changes later.
            </p>
          </div>
        </div>
      </div>

      {templates.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            <LayoutTemplate className="h-4 w-4" />
            Start from a template
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => handleCreateFromTemplate(t.id)}
                disabled={creatingFromTemplate !== null}
                className="group relative rounded-xl border bg-card p-4 text-left transition-all hover:border-primary/50 hover:shadow-md disabled:opacity-60"
              >
                <p className="font-medium text-sm">{t.name}</p>
                {t.description && (
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {t.description}
                  </p>
                )}
                {creatingFromTemplate === t.id && (
                  <p className="mt-2 text-xs text-primary">Creating...</p>
                )}
              </button>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Or start from scratch below
          </p>
        </div>
      )}

      <EventBasicsForm mode="create" onSubmit={handleCreate} />
    </div>
  );
}

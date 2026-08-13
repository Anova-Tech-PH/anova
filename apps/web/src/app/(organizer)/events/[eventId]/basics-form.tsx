"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@attendly/ui/supabase/client";
import { EventBasicsForm } from "@/features/events/components/event-basics-form";
import type { EventFormData } from "@/features/events/components/event-basics-form";

export function BasicsForm({
  event,
}: {
  event: Record<string, unknown> & { id: string };
}) {
  const router = useRouter();

  async function handleSave(data: EventFormData) {
    const supabase = createClient();

    const slug = (data.title || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const { error } = await supabase
      .from("events")
      .update({
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
        updated_at: new Date().toISOString(),
      })
      .eq("id", event.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Event updated");
    router.refresh();
  }

  return <EventBasicsForm mode="edit" event={event} onSubmit={handleSave} />;
}

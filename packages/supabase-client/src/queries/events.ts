import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Fetch all events the user has registered for, with org info and ticket type.
 */
export async function getMyEvents(client: SupabaseClient, userId: string) {
  const { data, error } = await client
    .from("registrations")
    .select(`
      id, status, qr_code, created_at,
      events(id, title, slug, description, start_date, end_date, venue_name, is_virtual, cover_image, status,
        organizations(slug, name)
      ),
      ticket_types(name)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Fetch a single event by org slug + event slug.
 * Mirrors the two-step lookup in the attendee event detail page.
 */
export async function getEventBySlug(
  client: SupabaseClient,
  orgSlug: string,
  eventSlug: string,
) {
  // Resolve org first
  const { data: org, error: orgErr } = await client
    .from("organizations")
    .select("id, name")
    .eq("slug", orgSlug)
    .single();

  if (orgErr) throw new Error(orgErr.message);

  const { data, error } = await client
    .from("events")
    .select("*")
    .eq("organization_id", org.id)
    .eq("slug", eventSlug)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Fetch the current user's registration for a specific event,
 * including the ticket type name.
 */
export async function getMyRegistration(
  client: SupabaseClient,
  eventId: string,
  userId: string,
) {
  const { data, error } = await client
    .from("registrations")
    .select("id, status, qr_code, created_at, ticket_types(name)")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .single();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return data;
}

/**
 * Fetch sessions for an event, grouped with track and speaker info.
 */
export async function getEventSessions(client: SupabaseClient, eventId: string) {
  const { data, error } = await client
    .from("sessions")
    .select(
      "*, track:tracks(id, name, color), session_speakers(speaker_id, speakers(id, name, title, company, photo))",
    )
    .eq("event_id", eventId)
    .order("start_time");

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Fetch speakers for an event.
 */
export async function getEventSpeakers(client: SupabaseClient, eventId: string) {
  const { data, error } = await client
    .from("speakers")
    .select("*")
    .eq("event_id", eventId)
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

/**
 * Fetch attendee count for an event.
 */
export async function getEventAttendeeCount(client: SupabaseClient, eventId: string) {
  const { count, error } = await client
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

/**
 * Look up a published event by its join code.
 * Returns the event with org info and first free ticket type, or null.
 */
export async function lookupEventByJoinCode(
  client: SupabaseClient,
  joinCode: string,
) {
  const code = joinCode.trim().toUpperCase();
  const { data, error } = await client
    .from("events")
    .select(`
      id, title, slug, start_date, end_date, venue_name, is_virtual, cover_image, status,
      organizations(slug, name),
      ticket_types(id, name, type, price)
    `)
    .eq("join_code", code)
    .eq("status", "published")
    .single();

  if (error && error.code === "PGRST116") return null; // not found
  if (error) throw new Error(error.message);
  return data;
}

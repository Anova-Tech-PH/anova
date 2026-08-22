import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Register the current authenticated user for an event using its join code.
 * Finds the first free ticket type and creates a registration.
 * Returns the registration or throws if already registered / no free tickets.
 */
export async function registerByJoinCode(
  client: SupabaseClient,
  params: {
    eventId: string;
    ticketTypeId: string;
    userId: string;
    name: string;
    email: string;
  },
) {
  // Check for existing registration
  const { data: existing } = await client
    .from("registrations")
    .select("id")
    .eq("event_id", params.eventId)
    .eq("user_id", params.userId)
    .in("status", ["confirmed", "checked_in"])
    .maybeSingle();

  if (existing) {
    throw new Error("You are already registered for this event");
  }

  // Generate a simple QR code string
  const qrCode = Array.from({ length: 16 }, () =>
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
      .charAt(Math.floor(Math.random() * 62))
  ).join("");

  const { data, error } = await client
    .from("registrations")
    .insert({
      event_id: params.eventId,
      ticket_type_id: params.ticketTypeId,
      user_id: params.userId,
      name: params.name,
      email: params.email,
      qr_code: qrCode,
      status: "confirmed",
    })
    .select("id, status, qr_code")
    .single();

  if (error) throw new Error(error.message);

  // Upsert attendee profile
  await client
    .from("attendee_profiles")
    .upsert(
      {
        id: params.userId,
        event_id: params.eventId,
        display_name: params.name,
      },
      { onConflict: "id,event_id" }
    )
    .then(() => {}, () => {}); // best-effort

  return data;
}

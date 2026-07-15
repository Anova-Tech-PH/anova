"use server";

import { createClient } from "@/shared/utils/supabase/server";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { sendRegistrationConfirmationEmail } from "@/features/emails/actions";

export async function registerForEvent(data: {
  event_id: string;
  ticket_type_id: string;
  name: string;
  email: string;
  custom_fields?: Record<string, unknown>;
}) {
  const supabase = await createClient();

  // Check ticket availability
  const { data: ticket } = await supabase
    .from("ticket_types")
    .select("id, quantity")
    .eq("id", data.ticket_type_id)
    .single();

  if (!ticket) throw new Error("Ticket type not found");

  if (ticket.quantity) {
    const { count } = await supabase
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("ticket_type_id", data.ticket_type_id)
      .in("status", ["confirmed", "checked_in"]);

    if (count !== null && count >= ticket.quantity) {
      throw new Error("This ticket type is sold out");
    }
  }

  // Check for duplicate registration
  const { data: existing } = await supabase
    .from("registrations")
    .select("id")
    .eq("event_id", data.event_id)
    .eq("email", data.email)
    .in("status", ["confirmed", "checked_in"])
    .single();

  if (existing) {
    throw new Error("This email is already registered for this event");
  }

  // Get current user if logged in
  const { data: { user } } = await supabase.auth.getUser();

  const qrCode = nanoid(16);

  const { data: registration, error } = await supabase
    .from("registrations")
    .insert({
      event_id: data.event_id,
      ticket_type_id: data.ticket_type_id,
      user_id: user?.id ?? null,
      name: data.name,
      email: data.email,
      qr_code: qrCode,
      status: "confirmed",
      custom_fields: data.custom_fields ?? {},
    })
    .select("id, qr_code, name, email")
    .single();

  if (error) throw new Error(error.message);

  // Send confirmation email (non-blocking)
  const { data: ticketType } = await supabase
    .from("ticket_types")
    .select("name")
    .eq("id", data.ticket_type_id)
    .single();

  sendRegistrationConfirmationEmail(data.event_id, {
    name: data.name,
    email: data.email,
    ticketTypeName: ticketType?.name ?? "General",
  }).catch(() => {});

  return registration;
}

export async function checkInByQrCode(qrCode: string, eventId?: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  let query = supabase
    .from("registrations")
    .select("id, name, email, status, checked_in_at, event_id, ticket_type_id, ticket_types(name)")
    .eq("qr_code", qrCode);

  if (eventId) {
    query = query.eq("event_id", eventId);
  }

  const { data: registration, error: findError } = await query.single();

  if (findError || !registration) {
    throw new Error("Registration not found");
  }

  if (registration.status === "checked_in") {
    return {
      ...registration,
      already_checked_in: true,
    };
  }

  if (registration.status === "cancelled") {
    throw new Error("This registration has been cancelled");
  }

  const { error: updateError } = await supabase
    .from("registrations")
    .update({
      status: "checked_in",
      checked_in_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", registration.id);

  if (updateError) throw new Error(updateError.message);

  revalidatePath(`/events/${registration.event_id}/registrations`);
  revalidatePath(`/events/${registration.event_id}/check-in`);

  return {
    ...registration,
    status: "checked_in",
    checked_in_at: new Date().toISOString(),
    already_checked_in: false,
  };
}

export async function updateRegistrationStatus(
  eventId: string,
  registrationId: string,
  status: string
) {
  const validStatuses = ["confirmed", "checked_in", "cancelled"];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const update: Record<string, string> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "checked_in") {
    update.checked_in_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("registrations")
    .update(update)
    .eq("id", registrationId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/registrations`);
}

"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { sendRegistrationConfirmationEmail } from "@/features/emails/actions";

export async function registerForEvent(data: {
  event_id: string;
  ticket_type_id: string;
  name: string;
  email: string;
  custom_fields?: Record<string, unknown>;
  promo_code_id?: string;
  discount_amount?: number;
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

  // Validate and increment promo code if provided
  if (data.promo_code_id) {
    const { data: promo, error: promoError } = await supabase
      .from("promo_codes")
      .select("*")
      .eq("id", data.promo_code_id)
      .eq("event_id", data.event_id)
      .single();

    if (promoError || !promo) throw new Error("Invalid promo code");
    if (!promo.active) throw new Error("This promo code is no longer active");

    const now = new Date();
    if (promo.starts_at && new Date(promo.starts_at) > now) throw new Error("Promo code not yet active");
    if (promo.expires_at && new Date(promo.expires_at) < now) throw new Error("Promo code has expired");
    if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) {
      throw new Error("Promo code has reached its usage limit");
    }

    // Check applies_to restriction
    if (promo.applies_to && promo.applies_to.length > 0 && !promo.applies_to.includes(data.ticket_type_id)) {
      throw new Error("This promo code does not apply to the selected ticket type");
    }

    // Increment current_uses
    await supabase
      .from("promo_codes")
      .update({
        current_uses: promo.current_uses + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.promo_code_id);
  }

  // Get current user if logged in
  const { data: { user } } = await supabase.auth.getUser();

  // Approval workflow: check if the event requires approval for registrations.
  // If require_approval is true, new registrations start as "pending" instead of "confirmed".
  // Pending registrations must be approved by an organizer before the attendee receives confirmation.
  const { data: event } = await supabase
    .from("events")
    .select("require_approval")
    .eq("id", data.event_id)
    .single();

  const registrationStatus = event?.require_approval ? "pending" : "confirmed";

  const qrCode = nanoid(16);

  const insertData: Record<string, unknown> = {
    event_id: data.event_id,
    ticket_type_id: data.ticket_type_id,
    user_id: user?.id ?? null,
    name: data.name,
    email: data.email,
    qr_code: qrCode,
    status: registrationStatus,
    custom_fields: data.custom_fields ?? {},
  };

  if (data.promo_code_id) {
    insertData.promo_code_id = data.promo_code_id;
    insertData.discount_amount = data.discount_amount ?? 0;
  }

  const { error } = await supabase
    .from("registrations")
    .insert(insertData);

  if (error) throw new Error(error.message);

  // Mark any matching registration intent as converted (fire-and-forget)
  supabase
    .from("registration_intents")
    .update({
      status: "converted",
      updated_at: new Date().toISOString(),
    })
    .eq("event_id", data.event_id)
    .eq("email", data.email.toLowerCase().trim())
    .eq("status", "pending")
    .then(() => {});

  const registration = {
    id: "",
    qr_code: qrCode,
    name: data.name,
    email: data.email,
    status: registrationStatus,
  };

  // Only send confirmation email for confirmed registrations.
  // Pending registrations will receive an email when approved by the organizer.
  if (registrationStatus === "confirmed") {
    const { data: ticketType } = await supabase
      .from("ticket_types")
      .select("name")
      .eq("id", data.ticket_type_id)
      .single();

    sendRegistrationConfirmationEmail(data.event_id, {
      name: data.name,
      email: data.email,
      ticketTypeName: ticketType?.name ?? "General",
      qrCode,
    }).catch((err) => console.error("[Registration Email Error]", err));
  }

  return registration;
}

export async function checkInByQrCode(qrCode: string, eventId: string, sessionId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { data: registration, error: findError } = await supabase
    .from("registrations")
    .select("id, name, email, status, checked_in_at, event_id, ticket_type_id, ticket_types(name)")
    .eq("qr_code", qrCode)
    .eq("event_id", eventId)
    .single();

  if (findError || !registration) {
    throw new Error("Registration not found");
  }

  if (registration.status === "cancelled") {
    throw new Error("This registration has been cancelled");
  }

  // Insert into check_ins table (unique constraint handles duplicates)
  const { error: checkInError } = await supabase
    .from("check_ins")
    .insert({
      registration_id: registration.id,
      event_id: eventId,
      session_id: sessionId,
      checked_in_by: user.id,
    });

  if (checkInError) {
    // Unique constraint violation = already checked in for this session
    if (checkInError.code === "23505") {
      return {
        ...registration,
        already_checked_in: true,
      };
    }
    throw new Error(checkInError.message);
  }

  // Update registration status to checked_in on first-ever check-in (backward compat)
  if (registration.status !== "checked_in") {
    await supabase
      .from("registrations")
      .update({
        status: "checked_in",
        checked_in_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", registration.id);
  }

  revalidatePath(`/events/${eventId}/registrations`);
  revalidatePath(`/events/${eventId}/check-in`);

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
  const validStatuses = ["pending", "confirmed", "checked_in", "cancelled"];
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

export async function checkInByRegistrationId(registrationId: string, eventId: string, sessionId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { data: registration, error: findError } = await supabase
    .from("registrations")
    .select("id, name, email, status, qr_code, event_id, ticket_type_id, ticket_types(name)")
    .eq("id", registrationId)
    .eq("event_id", eventId)
    .single();

  if (findError || !registration) throw new Error("Registration not found");
  if (registration.status === "cancelled") throw new Error("This registration has been cancelled");

  const { error: checkInError } = await supabase
    .from("check_ins")
    .insert({
      registration_id: registration.id,
      event_id: eventId,
      session_id: sessionId,
      checked_in_by: user.id,
    });

  if (checkInError) {
    if (checkInError.code === "23505") {
      return { ...registration, already_checked_in: true };
    }
    throw new Error(checkInError.message);
  }

  if (registration.status !== "checked_in") {
    await supabase
      .from("registrations")
      .update({
        status: "checked_in",
        checked_in_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", registration.id);
  }

  revalidatePath(`/events/${eventId}/registrations`);
  revalidatePath(`/events/${eventId}/check-in`);

  return { ...registration, status: "checked_in", checked_in_at: new Date().toISOString(), already_checked_in: false };
}

export async function searchRegistrations(eventId: string, query: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { data, error } = await supabase
    .from("registrations")
    .select("id, name, email, status, ticket_type_id, ticket_types(name)")
    .eq("event_id", eventId)
    .in("status", ["confirmed", "checked_in"])
    .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
    .order("name")
    .limit(10);

  if (error) throw new Error(error.message);
  return data;
}

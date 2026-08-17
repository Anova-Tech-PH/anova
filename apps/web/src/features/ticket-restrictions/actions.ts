"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function upsertRestriction(
  eventId: string,
  ticketTypeId: string,
  restrictionType: "email_list" | "org_domain" | "domain_type" | "membership",
  values: string[]
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("ticket_restrictions")
    .upsert(
      {
        ticket_type_id: ticketTypeId,
        restriction_type: restrictionType,
        values,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "ticket_type_id,restriction_type" }
    );

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/member-tickets`);
}

export async function removeRestriction(
  eventId: string,
  ticketTypeId: string,
  restrictionType: "email_list" | "org_domain" | "domain_type" | "membership"
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("ticket_restrictions")
    .delete()
    .eq("ticket_type_id", ticketTypeId)
    .eq("restriction_type", restrictionType);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/member-tickets`);
}

export async function removeAllRestrictions(
  eventId: string,
  ticketTypeId: string
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("ticket_restrictions")
    .delete()
    .eq("ticket_type_id", ticketTypeId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/member-tickets`);
}

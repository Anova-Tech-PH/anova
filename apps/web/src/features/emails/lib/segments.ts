import { createClient } from "@attendly/ui/supabase/server";

type SegmentFilters = {
  ticket_type_ids?: string[];
  statuses?: string[];
  checked_in?: boolean;
  custom_field_filters?: { field_id: string; value: string }[];
  min_check_ins?: number;
  category?: string;
  excluded_categories?: string[];
  session_id?: string;
  attendee_ids?: string[];
};

export type { SegmentFilters };

export async function getSegmentedRecipients(
  eventId: string,
  filters?: SegmentFilters
) {
  const supabase = await createClient();

  let query = supabase
    .from("registrations")
    .select("id, name, email, status, ticket_type_id, custom_fields, user_id, ticket_types(name)")
    .eq("event_id", eventId)
    .eq("unsubscribed", false);

  if (filters?.ticket_type_ids && filters.ticket_type_ids.length > 0) {
    query = query.in("ticket_type_id", filters.ticket_type_ids);
  }

  if (filters?.statuses && filters.statuses.length > 0) {
    query = query.in("status", filters.statuses);
  } else {
    query = query.in("status", ["confirmed", "checked_in"]);
  }

  if (filters?.checked_in === true) {
    query = query.eq("status", "checked_in");
  } else if (filters?.checked_in === false) {
    query = query.neq("status", "checked_in");
  }

  if (filters?.category) {
    query = query.eq("category", filters.category);
  }

  if (filters?.excluded_categories && filters.excluded_categories.length > 0) {
    query = query.not(
      "category",
      "in",
      `(${filters.excluded_categories.join(",")})`
    );
  }

  if (filters?.attendee_ids && filters.attendee_ids.length > 0) {
    query = query.in("id", filters.attendee_ids);
  }

  const { data, error } = await query.order("name");
  if (error) throw new Error(error.message);

  let results = data;

  // Client-side filter for custom field values (JSONB filtering)
  if (filters?.custom_field_filters && filters.custom_field_filters.length > 0) {
    results = results.filter((r) => {
      const cf = (r.custom_fields ?? {}) as Record<string, unknown>;
      return filters.custom_field_filters!.every(
        (f) => String(cf[f.field_id] ?? "") === f.value
      );
    });
  }

  // Client-side filter for session RSVP (two-step: fetch confirmed user_ids, then filter)
  if (filters?.session_id) {
    const { data: rsvps } = await supabase
      .from("session_rsvps")
      .select("user_id")
      .eq("session_id", filters.session_id)
      .eq("status", "confirmed");

    const confirmedUserIds = new Set(
      (rsvps ?? []).map((r: { user_id: string }) => r.user_id)
    );
    results = results.filter(
      (r) => r.user_id && confirmedUserIds.has(r.user_id as string)
    );
  }

  // Client-side filter for min check-ins (requires separate query)
  if (filters?.min_check_ins && filters.min_check_ins > 0) {
    const { data: checkIns } = await supabase
      .from("check_ins")
      .select("registration_id")
      .eq("event_id", eventId);

    const countByReg: Record<string, number> = {};
    for (const ci of checkIns ?? []) {
      countByReg[ci.registration_id] = (countByReg[ci.registration_id] ?? 0) + 1;
    }

    results = results.filter(
      (r) => (countByReg[r.id] ?? 0) >= filters.min_check_ins!
    );
  }

  return results;
}

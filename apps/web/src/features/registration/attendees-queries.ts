import { createClient } from "@attendly/ui/supabase/server";

type AttendeesParams = {
  page: number;
  pageSize: number;
  category_id?: string;
  search?: string;
};

export async function getAttendees(eventId: string, params: AttendeesParams) {
  const supabase = await createClient();
  const { page, pageSize, category_id, search } = params;

  let query = supabase
    .from("registrations")
    .select(
      "id, name, email, title, company, category, category_id, status, user_id, created_at",
      { count: "exact" }
    )
    .eq("event_id", eventId)
    .not("status", "eq", "cancelled");

  if (category_id) {
    query = query.eq("category_id", category_id);
  }

  if (search) {
    query = query.or(
      `name.ilike.%${search}%,email.ilike.%${search}%,title.ilike.%${search}%,company.ilike.%${search}%`
    );
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);
  return { data: data ?? [], total: count ?? 0 };
}

export async function getAttendeeCategories(eventId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("attendee_categories")
    .select("id, name, color")
    .eq("event_id", eventId)
    .order("sort_order");

  return data ?? [];
}

export async function getAttendeeStats(eventId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("registrations")
    .select("status, user_id, email")
    .eq("event_id", eventId);

  const registrations = data ?? [];

  return {
    total: registrations.length,
    withEmail: registrations.filter((r: { email: string | null }) => r.email).length,
    signedIn: registrations.filter((r: { user_id: string | null }) => r.user_id).length,
  };
}

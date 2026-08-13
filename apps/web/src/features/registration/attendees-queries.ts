import { createClient } from "@attendly/ui/supabase/server";

type AttendeesParams = {
  page: number;
  pageSize: number;
  category?: string;
  search?: string;
};

export async function getAttendees(eventId: string, params: AttendeesParams) {
  const supabase = await createClient();
  const { page, pageSize, category, search } = params;

  let query = supabase
    .from("registrations")
    .select(
      "id, name, email, title, company, category, status, user_id, created_at",
      { count: "exact" }
    )
    .eq("event_id", eventId)
    .not("status", "eq", "cancelled");

  if (category) {
    query = query.eq("category", category);
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
    .from("registrations")
    .select("category")
    .eq("event_id", eventId);

  const categories = (data ?? [])
    .map((r: { category: string | null }) => r.category)
    .filter((c): c is string => c !== null);

  return [...new Set(categories)];
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

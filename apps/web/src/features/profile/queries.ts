import { createClient } from "@/shared/utils/supabase/server";

export async function getCurrentProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data;
}

export async function getEventAttendees(eventId: string) {
  const supabase = await createClient();

  const { data: registrations } = await supabase
    .from("registrations")
    .select("user_id")
    .eq("event_id", eventId)
    .in("status", ["confirmed", "checked_in"])
    .not("user_id", "is", null);

  const userIds = registrations?.map((r) => r.user_id).filter(Boolean) as string[] ?? [];
  if (userIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .in("id", userIds)
    .order("full_name");

  return profiles ?? [];
}

import { createClient } from "@attendly/ui/supabase/server";

export async function getMyRegistrations(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("registrations")
    .select(`
      id, name, email, status, qr_code, created_at,
      ticket_types(name, type, price),
      events(id, title, slug, start_date, end_date, venue_name,
        organizations(slug))
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getMyBookmarkedSessions(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("session_bookmarks")
    .select(`
      session_id, created_at,
      sessions(
        id, title, description, start_time, end_time, location, type,
        track:tracks(id, name, color),
        session_speakers(speaker_id, speakers(id, name, title, photo)),
        events(id, title, slug, organizations(slug))
      )
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getMyProfile(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

import type { SupabaseClient } from "@supabase/supabase-js";

export async function getUserRsvps(client: SupabaseClient, eventId: string, userId: string) {
  const { data: sessions } = await client
    .from("sessions")
    .select("id")
    .eq("event_id", eventId);

  if (!sessions || sessions.length === 0) return [];

  const sessionIds = sessions.map((s: any) => s.id);

  const { data, error } = await client
    .from("session_rsvps")
    .select("*")
    .eq("user_id", userId)
    .in("session_id", sessionIds)
    .neq("status", "cancelled");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getSessionRsvpStatus(
  client: SupabaseClient,
  sessionId: string,
  userId?: string,
) {
  let userStatus: string | null = null;
  if (userId) {
    const { data } = await client
      .from("session_rsvps")
      .select("status")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .neq("status", "cancelled")
      .single();
    userStatus = (data as any)?.status ?? null;
  }

  const { count } = await client
    .from("session_rsvps")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("status", "confirmed");

  const { data: session } = await client
    .from("sessions")
    .select("capacity")
    .eq("id", sessionId)
    .single();

  return {
    status: userStatus,
    confirmedCount: count ?? 0,
    capacity: (session as any)?.capacity ?? null,
  };
}

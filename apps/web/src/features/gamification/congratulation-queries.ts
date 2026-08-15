"use server";

import { createClient } from "@attendly/ui/supabase/server";

export async function getCongratulationCounts(
  eventId: string
): Promise<Map<string, number>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leaderboard_congratulations")
    .select("to_user_id, count:to_user_id.count()")
    .eq("event_id", eventId);

  if (error || !data) return new Map();

  const map = new Map<string, number>();
  for (const row of data as Record<string, unknown>[]) {
    map.set(row.to_user_id as string, Number(row.count ?? 0));
  }
  return map;
}

export async function getUserCongratulations(
  eventId: string,
  userId: string
): Promise<Set<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leaderboard_congratulations")
    .select("to_user_id")
    .eq("event_id", eventId)
    .eq("from_user_id", userId);

  if (error || !data) return new Set();
  return new Set(
    (data as Record<string, unknown>[]).map((r) => r.to_user_id as string)
  );
}

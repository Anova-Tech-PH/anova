"use server";

import { createClient } from "@attendly/ui/supabase/server";

export async function toggleCongratulation(
  eventId: string,
  toUserId: string
): Promise<{ congratulated: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  if (user.id === toUserId) throw new Error("Cannot congratulate yourself");

  const { data: existing } = await supabase
    .from("leaderboard_congratulations")
    .select("id")
    .eq("event_id", eventId)
    .eq("from_user_id", user.id)
    .eq("to_user_id", toUserId)
    .single();

  if (existing) {
    await supabase
      .from("leaderboard_congratulations")
      .delete()
      .eq("event_id", eventId)
      .eq("from_user_id", user.id)
      .eq("to_user_id", toUserId);
    return { congratulated: false };
  } else {
    const { error } = await supabase
      .from("leaderboard_congratulations")
      .insert({
        event_id: eventId,
        from_user_id: user.id,
        to_user_id: toUserId,
      });
    if (error) throw new Error(error.message);
    return { congratulated: true };
  }
}

import type { SupabaseClient } from "@supabase/supabase-js";

export async function votePoll(
  client: SupabaseClient,
  params: {
    pollId: string;
    optionId: string;
    userId: string;
  }
): Promise<void> {
  // Delete existing vote then insert (partial unique index doesn't support simple upsert)
  await client.from("live_poll_votes").delete().eq("poll_id", params.pollId).eq("user_id", params.userId);
  const { error } = await client.from("live_poll_votes").insert({
    poll_id: params.pollId,
    user_id: params.userId,
    option_id: params.optionId,
  });
  if (error) throw new Error(error.message);
}

export async function submitPollTextResponse(
  client: SupabaseClient,
  params: {
    pollId: string;
    userId: string;
    responseText: string;
  }
): Promise<void> {
  await client.from("live_poll_votes").delete().eq("poll_id", params.pollId).eq("user_id", params.userId);
  const { error } = await client.from("live_poll_votes").insert({
    poll_id: params.pollId,
    user_id: params.userId,
    response_text: params.responseText,
  });
  if (error) throw new Error(error.message);
}

export async function submitPollRating(
  client: SupabaseClient,
  params: {
    pollId: string;
    userId: string;
    ratingValue: number;
  }
): Promise<void> {
  await client.from("live_poll_votes").delete().eq("poll_id", params.pollId).eq("user_id", params.userId);
  const { error } = await client.from("live_poll_votes").insert({
    poll_id: params.pollId,
    user_id: params.userId,
    rating_value: params.ratingValue,
  });
  if (error) throw new Error(error.message);
}

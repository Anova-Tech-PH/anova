"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";
import type { PollOption, AnswerType } from "./queries";
import { tryAwardPoints } from "@/features/gamification/award";

export async function createPoll(
  eventId: string,
  data: {
    question: string;
    options: PollOption[];
    session_id?: string;
    is_anonymous?: boolean;
    prompt_attendee?: boolean;
    result_visibility?: "everyone" | "after_closed" | "organizers_only";
    open_time_mode?: "now" | "before_session" | "scheduled";
    open_before_minutes?: number;
    scheduled_open_at?: string;
    answer_type?: AnswerType;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { data: poll, error } = await supabase
    .from("live_polls")
    .insert({
      event_id: eventId,
      created_by: user.id,
      question: data.question,
      options: data.options as unknown as Record<string, unknown>[],
      session_id: data.session_id ?? null,
      is_anonymous: data.is_anonymous ?? false,
      prompt_attendee: data.prompt_attendee ?? true,
      result_visibility: data.result_visibility ?? "everyone",
      open_time_mode: data.open_time_mode ?? "now",
      open_before_minutes: data.open_before_minutes ?? 0,
      scheduled_open_at: data.scheduled_open_at ?? null,
      answer_type: data.answer_type ?? "multiple_choice",
      status: data.open_time_mode === "now" ? "open" : "draft",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/polls`);
  if (data.session_id) {
    revalidatePath("/", "layout");
  }
  return poll;
}

export async function updatePoll(
  eventId: string,
  pollId: string,
  data: { question?: string; options?: PollOption[] }
) {
  const supabase = await createClient();

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.question !== undefined) update.question = data.question;
  if (data.options !== undefined) update.options = data.options as unknown as Record<string, unknown>[];

  const { error } = await supabase
    .from("live_polls")
    .update(update)
    .eq("id", pollId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/polls`);
}

export async function deletePoll(eventId: string, pollId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("live_polls")
    .delete()
    .eq("id", pollId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/polls`);
}

export async function openPoll(eventId: string, pollId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("live_polls")
    .update({ status: "open", updated_at: new Date().toISOString() })
    .eq("id", pollId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/polls`);
}

export async function closePoll(eventId: string, pollId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("live_polls")
    .update({ status: "closed", updated_at: new Date().toISOString() })
    .eq("id", pollId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/polls`);
}

export async function togglePollResults(eventId: string, pollId: string, show: boolean) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("live_polls")
    .update({ show_results: show, updated_at: new Date().toISOString() })
    .eq("id", pollId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/polls`);
}

export async function votePoll(pollId: string, optionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  // Try upsert (insert or update)
  const { error } = await supabase
    .from("live_poll_votes")
    .upsert(
      { poll_id: pollId, user_id: user.id, option_id: optionId },
      { onConflict: "poll_id,user_id" }
    );

  if (error) throw new Error(error.message);

  // Award gamification points
  const { data: poll } = await supabase
    .from("live_polls")
    .select("event_id")
    .eq("id", pollId)
    .single();

  if (poll?.event_id) {
    await tryAwardPoints(poll.event_id, user.id, "poll_vote", pollId, "poll");
  }
}

export async function voteRating(pollId: string, rating: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  // Delete existing then insert (partial unique index doesn't work with Supabase upsert)
  await supabase.from("live_poll_votes").delete().eq("poll_id", pollId).eq("user_id", user.id);
  const { error } = await supabase.from("live_poll_votes").insert({
    poll_id: pollId, user_id: user.id, rating_value: rating,
  });
  if (error) throw new Error(error.message);

  const { data: poll } = await supabase.from("live_polls").select("event_id").eq("id", pollId).single();
  if (poll?.event_id) await tryAwardPoints(poll.event_id, user.id, "poll_vote", pollId, "poll");
}

export async function voteText(pollId: string, text: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  await supabase.from("live_poll_votes").delete().eq("poll_id", pollId).eq("user_id", user.id);
  const { error } = await supabase.from("live_poll_votes").insert({
    poll_id: pollId, user_id: user.id, response_text: text.trim(),
  });
  if (error) throw new Error(error.message);

  const { data: poll } = await supabase.from("live_polls").select("event_id").eq("id", pollId).single();
  if (poll?.event_id) await tryAwardPoints(poll.event_id, user.id, "poll_vote", pollId, "poll");
}

export async function voteCheckbox(pollId: string, optionIds: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  // Delete all existing votes for this poll+user, then insert new ones
  await supabase.from("live_poll_votes").delete().eq("poll_id", pollId).eq("user_id", user.id);
  const rows = optionIds.map((optionId) => ({
    poll_id: pollId, user_id: user.id, option_id: optionId,
  }));
  const { error } = await supabase.from("live_poll_votes").insert(rows);
  if (error) throw new Error(error.message);

  const { data: poll } = await supabase.from("live_polls").select("event_id").eq("id", pollId).single();
  if (poll?.event_id) await tryAwardPoints(poll.event_id, user.id, "poll_vote", pollId, "poll");
}

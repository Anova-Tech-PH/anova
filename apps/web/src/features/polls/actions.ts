"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";
import type { PollOption } from "./queries";

export async function createPoll(
  eventId: string,
  data: {
    question: string;
    options: PollOption[];
    session_id?: string;
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
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/polls`);
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
}

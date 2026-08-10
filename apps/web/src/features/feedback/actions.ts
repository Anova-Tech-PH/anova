"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";
import type { FeedbackQuestion } from "./queries";

export async function createFeedbackForm(
  eventId: string,
  data: { name: string; questions: FeedbackQuestion[]; is_default?: boolean }
) {
  const supabase = await createClient();

  const { data: form, error } = await supabase
    .from("feedback_forms")
    .insert({
      event_id: eventId,
      name: data.name,
      questions: data.questions as unknown as Record<string, unknown>[],
      is_default: data.is_default ?? false,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/feedback`);
  return form;
}

export async function updateFeedbackForm(
  eventId: string,
  formId: string,
  data: { name?: string; questions?: FeedbackQuestion[] }
) {
  const supabase = await createClient();

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.name !== undefined) update.name = data.name;
  if (data.questions !== undefined) update.questions = data.questions as unknown as Record<string, unknown>[];

  const { error } = await supabase
    .from("feedback_forms")
    .update(update)
    .eq("id", formId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/feedback`);
}

export async function deleteFeedbackForm(eventId: string, formId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("feedback_forms")
    .delete()
    .eq("id", formId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/feedback`);
}

export async function assignFeedbackForm(
  eventId: string,
  sessionId: string,
  formId: string | null
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("sessions")
    .update({ feedback_form_id: formId, updated_at: new Date().toISOString() })
    .eq("id", sessionId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/feedback`);
  revalidatePath(`/events/${eventId}/schedule`);
}

export async function submitSessionFeedback(
  sessionId: string,
  formId: string,
  answers: Record<string, string | number>
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { error } = await supabase
    .from("session_feedback")
    .insert({
      session_id: sessionId,
      user_id: user.id,
      feedback_form_id: formId,
      answers: answers as unknown as Record<string, unknown>,
    });

  if (error) {
    if (error.code === "23505") {
      throw new Error("You have already submitted feedback for this session.");
    }
    throw new Error(error.message);
  }
}

"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function submitQuestion({
  session_id,
  event_id,
  question_text,
  is_anonymous,
  moderation_enabled,
}: {
  session_id: string;
  event_id: string;
  question_text: string;
  is_anonymous: boolean;
  moderation_enabled: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const status = moderation_enabled ? "pending" : "approved";

  const { data, error } = await supabase
    .from("session_questions")
    .insert({
      session_id,
      event_id,
      user_id: user.id,
      question_text,
      is_anonymous,
      status,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${event_id}/qa`);
  return data;
}

export async function answerQuestion(
  questionId: string,
  eventId: string,
  answerText: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { error } = await supabase
    .from("session_questions")
    .update({
      answer_text: answerText,
      answered_by: user.id,
      answered_at: new Date().toISOString(),
      status: "answered",
    })
    .eq("id", questionId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/qa`);
}

export async function moderateQuestion(
  questionId: string,
  eventId: string,
  status: "approved" | "rejected"
) {
  if (status !== "approved" && status !== "rejected") {
    throw new Error("Invalid status. Must be 'approved' or 'rejected'");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { error } = await supabase
    .from("session_questions")
    .update({ status })
    .eq("id", questionId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/qa`);
}

export async function bulkModerateQuestions(
  questionIds: string[],
  eventId: string,
  status: "approved" | "rejected"
) {
  if (status !== "approved" && status !== "rejected") {
    throw new Error("Invalid status. Must be 'approved' or 'rejected'");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { error } = await supabase
    .from("session_questions")
    .update({ status })
    .in("id", questionIds);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/qa`);
}

export async function togglePinQuestion(
  questionId: string,
  eventId: string,
  pinned: boolean
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { error } = await supabase
    .from("session_questions")
    .update({ is_pinned: pinned })
    .eq("id", questionId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/qa`);
}

export async function toggleUpvote(questionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  // Check if upvote exists
  const { data: existing } = await supabase
    .from("question_upvotes")
    .select("id")
    .eq("question_id", questionId)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("question_upvotes")
      .delete()
      .eq("question_id", questionId)
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
    return { upvoted: false };
  } else {
    const { error } = await supabase
      .from("question_upvotes")
      .insert({ question_id: questionId, user_id: user.id });
    if (error) throw new Error(error.message);
    return { upvoted: true };
  }
}

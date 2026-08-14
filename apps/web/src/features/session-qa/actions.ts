"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function askQuestion({
  sessionId,
  eventId,
  content,
  isAnonymous = false,
}: {
  sessionId: string;
  eventId: string;
  content: string;
  isAnonymous?: boolean;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");
  if (!content.trim()) throw new Error("Question cannot be empty");

  const { error } = await supabase.from("session_questions").insert({
    session_id: sessionId,
    event_id: eventId,
    user_id: user.id,
    question_text: content.trim(),
    is_anonymous: isAnonymous,
    status: "approved", // attendee questions default to approved (moderation handled by organizer toggle)
  });

  if (error) throw new Error(error.message);
  revalidatePath("/");
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
    // Remove upvote — trigger auto-decrements upvote_count
    const { error } = await supabase
      .from("question_upvotes")
      .delete()
      .eq("question_id", questionId)
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
    return { upvoted: false };
  } else {
    // Add upvote — trigger auto-increments upvote_count
    const { error } = await supabase
      .from("question_upvotes")
      .insert({ question_id: questionId, user_id: user.id });
    if (error) throw new Error(error.message);
    return { upvoted: true };
  }
}

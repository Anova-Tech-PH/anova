"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";
import type { SurveyQuestion } from "./queries";

export async function createOrUpdateSurvey(
  eventId: string,
  data: { title: string; questions: SurveyQuestion[] }
) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("surveys")
    .select("id")
    .eq("event_id", eventId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("surveys")
      .update({
        title: data.title,
        questions: data.questions as unknown as Record<string, unknown>[],
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("surveys").insert({
      event_id: eventId,
      title: data.title,
      questions: data.questions as unknown as Record<string, unknown>[],
    });

    if (error) throw new Error(error.message);
  }

  revalidatePath(`/events/${eventId}/survey`);
}

export async function submitSurveyResponse(
  surveyId: string,
  email: string,
  answers: Record<string, string | number>
) {
  const supabase = await createClient();

  // Check for duplicate
  const { data: existingResponse } = await supabase
    .from("survey_responses")
    .select("id")
    .eq("survey_id", surveyId)
    .eq("respondent_email", email.toLowerCase().trim())
    .single();

  if (existingResponse) {
    throw new Error("You have already submitted a response for this survey.");
  }

  const { error } = await supabase.from("survey_responses").insert({
    survey_id: surveyId,
    respondent_email: email.toLowerCase().trim(),
    answers: answers as unknown as Record<string, unknown>,
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error("You have already submitted a response for this survey.");
    }
    throw new Error(error.message);
  }
}

export async function toggleSurveyActive(
  eventId: string,
  surveyId: string,
  active: boolean
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("surveys")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", surveyId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/survey`);
}

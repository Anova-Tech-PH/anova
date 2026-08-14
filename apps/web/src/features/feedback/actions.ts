"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";
import type { FeedbackQuestion, SessionFeedbackResponse } from "./queries";
import { getSessionSpeakers, getSessionFeedbackStats } from "./queries";
import { tryAwardPoints } from "@/features/gamification/award";
import { sendEmail } from "@/features/emails/lib/send-email";

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

  // Award gamification points
  const { data: session } = await supabase
    .from("sessions")
    .select("event_id")
    .eq("id", sessionId)
    .single();

  if (session?.event_id) {
    await tryAwardPoints(session.event_id, user.id, "session_feedback", sessionId, "session");
  }
}

export async function getEventFeedbackForExport(eventId: string): Promise<{
  questions: FeedbackQuestion[];
  responses: SessionFeedbackResponse[];
}> {
  const supabase = await createClient();

  // Get the default (or first) feedback form for questions
  const { data: forms } = await supabase
    .from("feedback_forms")
    .select("*")
    .eq("event_id", eventId)
    .order("is_default", { ascending: false });

  const form = forms?.[0];
  const questions: FeedbackQuestion[] = form
    ? ((form.questions ?? []) as FeedbackQuestion[])
    : [];

  // Get all sessions for this event
  const { data: sessions } = await supabase
    .from("sessions")
    .select("id")
    .eq("event_id", eventId);

  if (!sessions || sessions.length === 0) {
    return { questions, responses: [] };
  }

  const sessionIds = sessions.map((s) => s.id);

  const { data: feedback, error } = await supabase
    .from("session_feedback")
    .select("*")
    .in("session_id", sessionIds)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const responses: SessionFeedbackResponse[] = (feedback ?? []).map((r) => ({
    ...r,
    answers: (r.answers ?? {}) as Record<string, string | number>,
  })) as SessionFeedbackResponse[];

  return { questions, responses };
}

function buildFeedbackEmailHtml(
  sessionTitle: string,
  eventTitle: string,
  stats: Awaited<ReturnType<typeof getSessionFeedbackStats>>
): string {
  let html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
    <h2>Session Feedback Report</h2>
    <p>Here is the feedback summary for <strong>${sessionTitle}</strong>.</p>
    <p><strong>Total:</strong> ${stats.totalResponses} responses</p>`;

  for (const [, qs] of Object.entries(stats.questionStats)) {
    html += `<div style="margin-top:16px;padding:12px;background:#f9f9f9;border-radius:8px">`;
    html += `<h3 style="margin:0 0 8px">${qs.label}</h3>`;

    if (qs.type === "rating" && qs.averageRating !== undefined) {
      html += `<p>Average rating: <strong>${qs.averageRating.toFixed(1)}</strong> / 5</p>`;
      if (qs.ratingDistribution) {
        html += `<p style="color:#666;font-size:13px">`;
        for (let i = 5; i >= 1; i--) {
          html += `${i}★: ${qs.ratingDistribution[i] ?? 0} &nbsp; `;
        }
        html += `</p>`;
      }
    } else if (qs.type === "text" && qs.textResponses) {
      if (qs.textResponses.length === 0) {
        html += `<p style="color:#666">No text responses</p>`;
      } else {
        html += `<ul style="padding-left:16px">`;
        for (const t of qs.textResponses.slice(0, 20)) {
          html += `<li style="margin-bottom:4px">${t}</li>`;
        }
        if (qs.textResponses.length > 20) {
          html += `<li style="color:#666">...and ${qs.textResponses.length - 20} more</li>`;
        }
        html += `</ul>`;
      }
    } else if (qs.type === "multiple_choice" && qs.optionDistribution) {
      html += `<ul style="padding-left:16px">`;
      for (const [option, count] of Object.entries(qs.optionDistribution)) {
        html += `<li>${option}: ${count}</li>`;
      }
      html += `</ul>`;
    }
    html += `</div>`;
  }

  html += `<hr style="margin-top:24px"/>
    <p style="color:#666;font-size:12px">Sent from ${eventTitle} via Evenstry</p>
  </div>`;

  return html;
}

export async function shareFeedbackWithSpeakers(
  eventId: string,
  sessionId: string,
  sessionTitle: string
): Promise<{ emailsSent: number }> {
  const supabase = await createClient();

  // 1. Get speakers with emails
  const speakers = await getSessionSpeakers(sessionId);
  if (speakers.length === 0) {
    return { emailsSent: 0 };
  }

  // 2. Get event info
  const { data: event } = await supabase
    .from("events")
    .select("title, organization_id")
    .eq("id", eventId)
    .single();

  if (!event) throw new Error("Event not found");

  // 3. Get feedback form for this session
  const { data: session } = await supabase
    .from("sessions")
    .select("feedback_form_id")
    .eq("id", sessionId)
    .single();

  let questions: FeedbackQuestion[] = [];
  if (session?.feedback_form_id) {
    const { data: form } = await supabase
      .from("feedback_forms")
      .select("questions")
      .eq("id", session.feedback_form_id)
      .single();

    if (form) {
      questions = (form.questions ?? []) as FeedbackQuestion[];
    }
  }

  // 4. Get feedback stats
  const stats = await getSessionFeedbackStats(sessionId, questions);

  // 5. Build email
  const subject = `Feedback Report: ${sessionTitle}`;
  const html = buildFeedbackEmailHtml(sessionTitle, event.title, stats);

  // 6. Send to each speaker
  let emailsSent = 0;
  for (const speaker of speakers) {
    await sendEmail({
      organizationId: event.organization_id,
      eventId,
      to: { email: speaker.email, name: speaker.name },
      subject,
      html,
    });
    emailsSent++;
  }

  return { emailsSent };
}

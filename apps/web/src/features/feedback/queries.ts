import { createClient } from "@attendly/ui/supabase/server";

export type FeedbackQuestion = {
  id: string;
  label: string;
  type: "rating" | "multiple_choice" | "text";
  options?: string[];
  required: boolean;
};

export type FeedbackForm = {
  id: string;
  event_id: string;
  name: string;
  questions: FeedbackQuestion[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type SessionFeedbackResponse = {
  id: string;
  session_id: string;
  user_id: string;
  feedback_form_id: string;
  answers: Record<string, string | number>;
  created_at: string;
};

export async function getFeedbackForms(eventId: string): Promise<FeedbackForm[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("feedback_forms")
    .select("*")
    .eq("event_id", eventId)
    .order("is_default", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((f) => ({
    ...f,
    questions: (f.questions ?? []) as FeedbackQuestion[],
  })) as FeedbackForm[];
}

export async function getDefaultFeedbackForm(eventId: string): Promise<FeedbackForm | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("feedback_forms")
    .select("*")
    .eq("event_id", eventId)
    .eq("is_default", true)
    .single();

  if (error || !data) return null;
  return {
    ...data,
    questions: (data.questions ?? []) as FeedbackQuestion[],
  } as FeedbackForm;
}

export async function getSessionFeedback(sessionId: string): Promise<SessionFeedbackResponse[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("session_feedback")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    ...r,
    answers: (r.answers ?? {}) as Record<string, string | number>,
  })) as SessionFeedbackResponse[];
}

export async function getSessionFeedbackStats(
  sessionId: string,
  questions: FeedbackQuestion[]
) {
  const responses = await getSessionFeedback(sessionId);

  const stats: {
    totalResponses: number;
    questionStats: Record<
      string,
      {
        type: FeedbackQuestion["type"];
        label: string;
        averageRating?: number;
        ratingDistribution?: Record<number, number>;
        textResponses?: string[];
        optionDistribution?: Record<string, number>;
      }
    >;
  } = {
    totalResponses: responses.length,
    questionStats: {},
  };

  for (const q of questions) {
    if (q.type === "rating") {
      const ratings: number[] = [];
      const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

      for (const r of responses) {
        const val = Number(r.answers[q.id]);
        if (!isNaN(val) && val >= 1 && val <= 5) {
          ratings.push(val);
          distribution[val] = (distribution[val] ?? 0) + 1;
        }
      }

      stats.questionStats[q.id] = {
        type: "rating",
        label: q.label,
        averageRating: ratings.length > 0
          ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
          : 0,
        ratingDistribution: distribution,
      };
    } else if (q.type === "text") {
      const textResponses: string[] = [];
      for (const r of responses) {
        const val = r.answers[q.id];
        if (val && typeof val === "string" && val.trim()) {
          textResponses.push(val);
        }
      }
      stats.questionStats[q.id] = {
        type: "text",
        label: q.label,
        textResponses,
      };
    } else if (q.type === "multiple_choice") {
      const distribution: Record<string, number> = {};
      for (const opt of q.options ?? []) {
        distribution[opt] = 0;
      }
      for (const r of responses) {
        const val = r.answers[q.id];
        if (val && typeof val === "string") {
          distribution[val] = (distribution[val] ?? 0) + 1;
        }
      }
      stats.questionStats[q.id] = {
        type: "multiple_choice",
        label: q.label,
        optionDistribution: distribution,
      };
    }
  }

  return stats;
}

export async function getSessionSpeakers(
  sessionId: string
): Promise<{ name: string; email: string }[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("session_speakers")
    .select("speakers(name, email)")
    .eq("session_id", sessionId);

  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((row) => {
      const speaker = row.speakers as unknown as { name: string; email: string | null };
      return speaker?.email ? { name: speaker.name, email: speaker.email } : null;
    })
    .filter((s): s is { name: string; email: string } => s !== null);
}

export async function getEventFeedbackSummary(eventId: string) {
  const supabase = await createClient();

  const { data: sessions, error } = await supabase
    .from("sessions")
    .select("id, title, start_time, feedback_form_id")
    .eq("event_id", eventId)
    .order("start_time", { ascending: true });

  if (error) throw new Error(error.message);

  const summaries = [];
  for (const session of sessions ?? []) {
    const { data: feedback } = await supabase
      .from("session_feedback")
      .select("answers")
      .eq("session_id", session.id);

    const responseCount = feedback?.length ?? 0;
    let avgRating = 0;

    if (feedback && feedback.length > 0) {
      const ratings: number[] = [];
      for (const f of feedback) {
        const answers = f.answers as Record<string, unknown>;
        for (const val of Object.values(answers)) {
          const num = Number(val);
          if (!isNaN(num) && num >= 1 && num <= 5) {
            ratings.push(num);
          }
        }
      }
      if (ratings.length > 0) {
        avgRating = Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;
      }
    }

    summaries.push({
      session_id: session.id,
      title: session.title,
      start_time: session.start_time,
      response_count: responseCount,
      avg_rating: avgRating,
      has_form: !!session.feedback_form_id,
    });
  }

  return summaries;
}

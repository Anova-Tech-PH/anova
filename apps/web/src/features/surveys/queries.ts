import { createClient } from "@attendly/ui/supabase/server";

export type SurveyQuestion = {
  id: string;
  label: string;
  type: "rating" | "text" | "select";
  options?: string[];
  required: boolean;
};

export type Survey = {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  questions: SurveyQuestion[];
  active: boolean;
  status: "draft" | "active" | "closed";
  created_at: string;
  updated_at: string;
};

export type SurveyResponse = {
  id: string;
  survey_id: string;
  registration_id: string | null;
  respondent_email: string;
  answers: Record<string, string | number>;
  created_at: string;
};

export async function getSurveysByEvent(eventId: string): Promise<Survey[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("surveys")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return data.map((d) => ({
    ...d,
    questions: (d.questions ?? []) as SurveyQuestion[],
  })) as Survey[];
}

/** @deprecated Use getSurveysByEvent instead. Returns the first active survey for backward compat. */
export async function getSurveyByEvent(eventId: string): Promise<Survey | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("surveys")
    .select("*")
    .eq("event_id", eventId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  return {
    ...data,
    questions: (data.questions ?? []) as SurveyQuestion[],
  } as Survey;
}

export async function getSurveyResponses(surveyId: string): Promise<SurveyResponse[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("survey_responses")
    .select("*")
    .eq("survey_id", surveyId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((r) => ({
    ...r,
    answers: (r.answers ?? {}) as Record<string, string | number>,
  })) as SurveyResponse[];
}

export type PastSurvey = {
  id: string;
  title: string;
  questions: SurveyQuestion[];
  event_title: string;
  event_id: string;
};

/**
 * Gets surveys from other events in the same organization.
 * Used by the "Reuse survey" feature.
 */
export async function getPastSurveys(currentEventId: string): Promise<PastSurvey[]> {
  const supabase = await createClient();

  // 1. Get the current event's organization_id
  const { data: currentEvent, error: eventError } = await supabase
    .from("events")
    .select("organization_id")
    .eq("id", currentEventId)
    .single();

  if (eventError || !currentEvent) return [];

  // 2. Find all OTHER events in the same organization
  const { data: otherEvents, error: eventsError } = await supabase
    .from("events")
    .select("id, title")
    .eq("organization_id", currentEvent.organization_id)
    .neq("id", currentEventId)
    .order("created_at", { ascending: false });

  if (eventsError || !otherEvents || otherEvents.length === 0) return [];

  const eventIds = otherEvents.map((e) => e.id);
  const eventTitleMap = Object.fromEntries(otherEvents.map((e) => [e.id, e.title]));

  // 3. Get all surveys from those events
  const { data: surveys, error: surveysError } = await supabase
    .from("surveys")
    .select("id, title, questions, event_id")
    .in("event_id", eventIds)
    .order("created_at", { ascending: false });

  if (surveysError || !surveys) return [];

  return surveys.map((s) => ({
    id: s.id,
    title: s.title,
    questions: (s.questions ?? []) as SurveyQuestion[],
    event_title: eventTitleMap[s.event_id] ?? "Unknown event",
    event_id: s.event_id,
  }));
}

export async function getSurveyStats(surveyId: string, questions: SurveyQuestion[]) {
  const responses = await getSurveyResponses(surveyId);

  const stats: {
    totalResponses: number;
    questionStats: Record<
      string,
      {
        type: SurveyQuestion["type"];
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
    } else if (q.type === "select") {
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
        type: "select",
        label: q.label,
        optionDistribution: distribution,
      };
    }
  }

  return stats;
}

import type { SupabaseClient } from "@supabase/supabase-js";

export async function applyAsVolunteer(
  client: SupabaseClient,
  params: {
    eventId: string;
    userId: string;
    email: string;
    name: string;
    phone?: string;
    organization?: string;
    roleIds?: string[];
    answers?: { questionId: string; answerText: string }[];
    availability?: { date: string; startTime?: string; endTime?: string }[];
  },
): Promise<{ id: string }> {
  const { data: app, error } = await client
    .from("volunteer_applications")
    .insert({
      event_id: params.eventId,
      user_id: params.userId,
      email: params.email,
      name: params.name,
      phone: params.phone ?? null,
      organization: params.organization ?? null,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  // Insert role preferences
  if (params.roleIds && params.roleIds.length > 0) {
    await client.from("volunteer_application_roles").insert(
      params.roleIds.map((roleId) => ({
        application_id: app.id,
        role_id: roleId,
      })),
    );
  }

  // Insert answers
  if (params.answers && params.answers.length > 0) {
    await client.from("volunteer_application_answers").insert(
      params.answers.map((a) => ({
        application_id: app.id,
        question_id: a.questionId,
        answer_text: a.answerText,
      })),
    );
  }

  // Insert availability
  if (params.availability && params.availability.length > 0) {
    await client.from("volunteer_application_availability").insert(
      params.availability.map((a) => ({
        application_id: app.id,
        available_date: a.date,
        start_time: a.startTime ?? null,
        end_time: a.endTime ?? null,
      })),
    );
  }

  return { id: app.id };
}

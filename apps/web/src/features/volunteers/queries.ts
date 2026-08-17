import { createClient } from "@attendly/ui/supabase/server";

// ─── Types ───────────────────────────────────────────────────

export type VolunteerSettings = {
  id: string;
  event_id: string;
  title: string;
  instructions: string | null;
  banner_image_url: string | null;
  application_deadline: string | null;
  auto_accept: boolean;
  auto_add_to_attendees: boolean;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type VolunteerRole = {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  max_volunteers: number | null;
  role_type: "built_in" | "custom";
  built_in_key: "session_moderator" | "community_moderator" | "checkin_staff" | null;
  sort_order: number;
  created_at: string;
};

export type VolunteerQuestion = {
  id: string;
  event_id: string;
  question_text: string;
  is_required: boolean;
  sort_order: number;
  created_at: string;
};

export type VolunteerApplication = {
  id: string;
  event_id: string;
  user_id: string | null;
  email: string;
  name: string;
  phone: string | null;
  organization: string | null;
  status: "pending" | "accepted" | "rejected";
  accepted_at: string | null;
  rejected_at: string | null;
  notes: string | null;
  created_at: string;
  role_preferences?: { id: string; role_id: string; role_name?: string }[];
  answers?: { id: string; question_id: string; answer_text: string; question_text?: string }[];
  availability?: { id: string; available_date: string; start_time: string | null; end_time: string | null }[];
  role_assignments?: { id: string; role_id: string; role_name?: string; assigned_at: string }[];
};

export type VolunteerInvitation = {
  id: string;
  event_id: string;
  email: string;
  name: string | null;
  status: "sent" | "opened" | "applied";
  sent_at: string;
  created_at: string;
};

export type VolunteerBreakdown = {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
  byRole: { role_id: string; role_name: string; count: number }[];
};

// ─── Queries ─────────────────────────────────────────────────

export async function getVolunteerSettings(
  eventId: string
): Promise<VolunteerSettings | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("volunteer_settings")
    .select("*")
    .eq("event_id", eventId)
    .single();

  if (error || !data) return null;
  return data as VolunteerSettings;
}

export async function getVolunteerRoles(eventId: string): Promise<VolunteerRole[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("volunteer_roles")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order");

  if (error) return [];
  return (data ?? []) as VolunteerRole[];
}

export async function getVolunteerQuestions(
  eventId: string
): Promise<VolunteerQuestion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("volunteer_questions")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order");

  if (error) return [];
  return (data ?? []) as VolunteerQuestion[];
}

export async function getApplications(
  eventId: string,
  filters?: { status?: string; roleId?: string; search?: string }
): Promise<{ applications: VolunteerApplication[]; total: number }> {
  const supabase = await createClient();

  let query = supabase
    .from("volunteer_applications")
    .select("*", { count: "exact" })
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (filters?.status) {
    query = query.eq("status", filters.status);
  }
  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
    );
  }

  const { data, error, count } = await query;
  if (error) return { applications: [], total: 0 };

  let applications = (data ?? []) as VolunteerApplication[];

  // If filtering by role, fetch role preferences and filter
  if (filters?.roleId) {
    const appIds = applications.map((a) => a.id);
    if (appIds.length > 0) {
      const { data: rolePrefs } = await supabase
        .from("volunteer_application_roles")
        .select("application_id, role_id")
        .in("application_id", appIds)
        .eq("role_id", filters.roleId);

      const matchingIds = new Set(
        (rolePrefs ?? []).map((r) => r.application_id)
      );
      applications = applications.filter((a) => matchingIds.has(a.id));
    }
  }

  return { applications, total: count ?? 0 };
}

export async function getApplication(
  applicationId: string
): Promise<VolunteerApplication | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("volunteer_applications")
    .select("*")
    .eq("id", applicationId)
    .single();

  if (error || !data) return null;

  const app = data as VolunteerApplication;

  // Fetch related data in parallel
  const [rolePrefs, answers, availability, assignments] = await Promise.all([
    supabase
      .from("volunteer_application_roles")
      .select("id, role_id, volunteer_roles(name)")
      .eq("application_id", applicationId),
    supabase
      .from("volunteer_application_answers")
      .select("id, question_id, answer_text, volunteer_questions(question_text)")
      .eq("application_id", applicationId),
    supabase
      .from("volunteer_application_availability")
      .select("id, available_date, start_time, end_time")
      .eq("application_id", applicationId)
      .order("available_date"),
    supabase
      .from("volunteer_role_assignments")
      .select("id, role_id, assigned_at, volunteer_roles(name)")
      .eq("application_id", applicationId),
  ]);

  app.role_preferences = (rolePrefs.data ?? []).map((r: any) => ({
    id: r.id,
    role_id: r.role_id,
    role_name: (r.volunteer_roles as any)?.name,
  }));

  app.answers = (answers.data ?? []).map((a: any) => ({
    id: a.id,
    question_id: a.question_id,
    answer_text: a.answer_text,
    question_text: (a.volunteer_questions as any)?.question_text,
  }));

  app.availability = (availability.data ?? []).map((a: any) => ({
    id: a.id,
    available_date: a.available_date,
    start_time: a.start_time,
    end_time: a.end_time,
  }));

  app.role_assignments = (assignments.data ?? []).map((a: any) => ({
    id: a.id,
    role_id: a.role_id,
    role_name: (a.volunteer_roles as any)?.name,
    assigned_at: a.assigned_at,
  }));

  return app;
}

export async function getVolunteerBreakdown(
  eventId: string
): Promise<VolunteerBreakdown> {
  const supabase = await createClient();

  const [totalResult, pendingResult, acceptedResult, rejectedResult, roles] =
    await Promise.all([
      supabase
        .from("volunteer_applications")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId),
      supabase
        .from("volunteer_applications")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("status", "pending"),
      supabase
        .from("volunteer_applications")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("status", "accepted"),
      supabase
        .from("volunteer_applications")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("status", "rejected"),
      supabase
        .from("volunteer_roles")
        .select("id, name")
        .eq("event_id", eventId)
        .order("sort_order"),
    ]);

  // Count assignments per role
  const byRole: VolunteerBreakdown["byRole"] = [];
  if (roles.data && roles.data.length > 0) {
    const { data: assignments } = await supabase
      .from("volunteer_role_assignments")
      .select("role_id")
      .in(
        "application_id",
        (
          await supabase
            .from("volunteer_applications")
            .select("id")
            .eq("event_id", eventId)
            .eq("status", "accepted")
        ).data?.map((a) => a.id) ?? []
      );

    const roleCounts = new Map<string, number>();
    for (const a of assignments ?? []) {
      roleCounts.set(a.role_id, (roleCounts.get(a.role_id) ?? 0) + 1);
    }

    for (const role of roles.data) {
      byRole.push({
        role_id: role.id,
        role_name: role.name,
        count: roleCounts.get(role.id) ?? 0,
      });
    }
  }

  return {
    total: totalResult.count ?? 0,
    pending: pendingResult.count ?? 0,
    accepted: acceptedResult.count ?? 0,
    rejected: rejectedResult.count ?? 0,
    byRole,
  };
}

export async function getInvitations(
  eventId: string
): Promise<VolunteerInvitation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("volunteer_invitations")
    .select("*")
    .eq("event_id", eventId)
    .order("sent_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as VolunteerInvitation[];
}

export async function getPublicVolunteerInfo(eventId: string): Promise<{
  settings: VolunteerSettings;
  roles: VolunteerRole[];
  questions: VolunteerQuestion[];
  eventDates: { start_date: string; end_date: string };
} | null> {
  const supabase = await createClient();

  const [settingsResult, rolesResult, questionsResult, eventResult] =
    await Promise.all([
      supabase
        .from("volunteer_settings")
        .select("*")
        .eq("event_id", eventId)
        .eq("is_published", true)
        .single(),
      supabase
        .from("volunteer_roles")
        .select("*")
        .eq("event_id", eventId)
        .order("sort_order"),
      supabase
        .from("volunteer_questions")
        .select("*")
        .eq("event_id", eventId)
        .order("sort_order"),
      supabase
        .from("events")
        .select("start_date, end_date")
        .eq("id", eventId)
        .single(),
    ]);

  if (!settingsResult.data || !eventResult.data) return null;

  return {
    settings: settingsResult.data as VolunteerSettings,
    roles: (rolesResult.data ?? []) as VolunteerRole[],
    questions: (questionsResult.data ?? []) as VolunteerQuestion[],
    eventDates: eventResult.data as { start_date: string; end_date: string },
  };
}

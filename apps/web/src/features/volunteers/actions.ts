"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";
import { sendEmail, substituteVariables } from "@/features/emails/lib/send-email";
import { randomUUID } from "crypto";

// ─── Settings ────────────────────────────────────────────────

export async function upsertVolunteerSettings(
  eventId: string,
  data: {
    title?: string;
    instructions?: string | null;
    banner_image_url?: string | null;
    application_deadline?: string | null;
    auto_accept?: boolean;
    auto_add_to_attendees?: boolean;
    is_published?: boolean;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { data: existing } = await supabase
    .from("volunteer_settings")
    .select("id")
    .eq("event_id", eventId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from("volunteer_settings")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("event_id", eventId);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("volunteer_settings")
      .insert({ event_id: eventId, ...data });
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/events/${eventId}/volunteers`);
}

export async function uploadBannerImage(
  eventId: string,
  formData: FormData
): Promise<string> {
  const file = formData.get("file") as File;
  if (!file) throw new Error("No file provided");

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Invalid file type. Only JPEG, PNG, and WebP are allowed.");
  }

  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) throw new Error("File too large. Maximum size is 5MB.");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${eventId}/${randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("volunteer-banners")
    .upload(path, file, { contentType: file.type });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage
    .from("volunteer-banners")
    .getPublicUrl(path);

  return data.publicUrl;
}

// ─── Roles ───────────────────────────────────────────────────

export async function createRole(
  eventId: string,
  data: {
    name: string;
    description?: string;
    max_volunteers?: number | null;
    role_type?: "built_in" | "custom";
    built_in_key?: string | null;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  // Get max sort order
  const { data: maxSort } = await supabase
    .from("volunteer_roles")
    .select("sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const { data: role, error } = await supabase
    .from("volunteer_roles")
    .insert({
      event_id: eventId,
      name: data.name,
      description: data.description ?? null,
      max_volunteers: data.max_volunteers ?? null,
      role_type: data.role_type ?? "custom",
      built_in_key: data.built_in_key ?? null,
      sort_order: (maxSort?.sort_order ?? -1) + 1,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/volunteers`);
  return role;
}

export async function updateRole(
  eventId: string,
  roleId: string,
  data: { name?: string; description?: string | null; max_volunteers?: number | null }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { error } = await supabase
    .from("volunteer_roles")
    .update(data)
    .eq("id", roleId)
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/volunteers`);
}

export async function deleteRole(eventId: string, roleId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { error } = await supabase
    .from("volunteer_roles")
    .delete()
    .eq("id", roleId)
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/volunteers`);
}

// ─── Questions ───────────────────────────────────────────────

export async function createQuestion(
  eventId: string,
  data: { question_text: string; is_required?: boolean }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { data: maxSort } = await supabase
    .from("volunteer_questions")
    .select("sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const { data: question, error } = await supabase
    .from("volunteer_questions")
    .insert({
      event_id: eventId,
      question_text: data.question_text,
      is_required: data.is_required ?? false,
      sort_order: (maxSort?.sort_order ?? -1) + 1,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/volunteers`);
  return question;
}

export async function updateQuestion(
  eventId: string,
  questionId: string,
  data: { question_text?: string; is_required?: boolean }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { error } = await supabase
    .from("volunteer_questions")
    .update(data)
    .eq("id", questionId)
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/volunteers`);
}

export async function deleteQuestion(eventId: string, questionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { error } = await supabase
    .from("volunteer_questions")
    .delete()
    .eq("id", questionId)
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/volunteers`);
}

export async function reorderQuestions(
  eventId: string,
  questionIds: string[]
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  for (let i = 0; i < questionIds.length; i++) {
    await supabase
      .from("volunteer_questions")
      .update({ sort_order: i })
      .eq("id", questionIds[i]);
  }

  revalidatePath(`/events/${eventId}/volunteers`);
}

// ─── Application Fetch (server action for client components) ─

export async function fetchApplication(applicationId: string) {
  const { getApplication } = await import("./queries");
  return getApplication(applicationId);
}

// ─── Applications ────────────────────────────────────────────

export async function updateApplicationStatus(
  eventId: string,
  applicationId: string,
  status: "accepted" | "rejected"
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const now = new Date().toISOString();
  const updateData: Record<string, unknown> = {
    status,
    ...(status === "accepted" ? { accepted_at: now } : { rejected_at: now }),
  };

  const { error, count } = await supabase
    .from("volunteer_applications")
    .update(updateData)
    .eq("id", applicationId)
    .eq("event_id", eventId)
    .eq("status", "pending");

  if (error) throw new Error(error.message);
  // If no rows updated, application was not pending or doesn't belong to this event
  if (count === 0) {
    revalidatePath(`/events/${eventId}/volunteers`);
    return;
  }

  // Get application and event details for notification email
  const [appResult, eventResult] = await Promise.all([
    supabase
      .from("volunteer_applications")
      .select("email, name, event_id")
      .eq("id", applicationId)
      .single(),
    supabase
      .from("events")
      .select("title, organization_id")
      .eq("id", eventId)
      .single(),
  ]);

  if (appResult.data && eventResult.data) {
    const app = appResult.data;
    const event = eventResult.data;

    if (status === "accepted") {
      // If auto_add_to_attendees is enabled, create registration
      const { data: settings } = await supabase
        .from("volunteer_settings")
        .select("auto_add_to_attendees")
        .eq("event_id", eventId)
        .single();

      if (settings?.auto_add_to_attendees) {
        await supabase.from("registrations").upsert(
          {
            event_id: eventId,
            email: app.email,
            name: app.name,
            status: "confirmed",
            source: "volunteer",
          },
          { onConflict: "event_id,email" }
        );
      }

      await sendEmail({
        organizationId: event.organization_id,
        eventId,
        to: { email: app.email, name: app.name },
        subject: `You've been accepted as a volunteer for ${event.title}!`,
        html: buildAcceptanceEmail(app.name, event.title),
      }).catch(() => {});
    } else {
      await sendEmail({
        organizationId: event.organization_id,
        eventId,
        to: { email: app.email, name: app.name },
        subject: `Volunteer application update for ${event.title}`,
        html: buildRejectionEmail(app.name, event.title),
      }).catch(() => {});
    }
  }

  // Update invitation status if applicable
  if (appResult.data) {
    await supabase
      .from("volunteer_invitations")
      .update({ status: "applied" })
      .eq("event_id", eventId)
      .eq("email", appResult.data.email);
  }

  revalidatePath(`/events/${eventId}/volunteers`);
}

export async function bulkUpdateStatus(
  eventId: string,
  applicationIds: string[],
  status: "accepted" | "rejected"
) {
  for (const id of applicationIds) {
    await updateApplicationStatus(eventId, id, status);
  }
}

export async function addOrganizerNotes(
  eventId: string,
  applicationId: string,
  notes: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { error } = await supabase
    .from("volunteer_applications")
    .update({ notes })
    .eq("id", applicationId)
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/volunteers`);
}

// ─── Role Assignments ────────────────────────────────────────

export async function assignRole(
  eventId: string,
  applicationId: string,
  roleId: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  // Verify application belongs to this event
  const { data: app } = await supabase
    .from("volunteer_applications")
    .select("id")
    .eq("id", applicationId)
    .eq("event_id", eventId)
    .single();
  if (!app) throw new Error("Application not found");

  const { error } = await supabase
    .from("volunteer_role_assignments")
    .insert({ application_id: applicationId, role_id: roleId });

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/volunteers`);
}

export async function unassignRole(
  eventId: string,
  applicationId: string,
  roleId: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { error } = await supabase
    .from("volunteer_role_assignments")
    .delete()
    .eq("application_id", applicationId)
    .eq("role_id", roleId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/volunteers`);
}

// ─── Invitations ─────────────────────────────────────────────

export async function sendInvitations(
  eventId: string,
  contacts: { email: string; name?: string }[],
  message?: string
) {
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("title, organization_id, slug, organization:organizations(slug)")
    .eq("id", eventId)
    .single();

  if (!event) throw new Error("Event not found");

  const orgSlug = (event.organization as unknown as { slug: string })?.slug;
  const applicationUrl = orgSlug && event.slug
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/${orgSlug}/${event.slug}/volunteer`
    : null;

  const invitations = [];
  for (const contact of contacts) {
    // Skip if already invited
    const { data: existing } = await supabase
      .from("volunteer_invitations")
      .select("id")
      .eq("event_id", eventId)
      .eq("email", contact.email)
      .single();

    if (existing) continue;

    const { data: invitation, error } = await supabase
      .from("volunteer_invitations")
      .insert({
        event_id: eventId,
        email: contact.email,
        name: contact.name ?? null,
      })
      .select()
      .single();

    if (error) continue;
    invitations.push(invitation);

    await sendEmail({
      organizationId: event.organization_id,
      eventId,
      to: { email: contact.email, name: contact.name },
      subject: `You're invited to volunteer at ${event.title}`,
      html: buildInvitationEmail(
        contact.name ?? "there",
        event.title,
        applicationUrl,
        message
      ),
    }).catch(() => {});
  }

  revalidatePath(`/events/${eventId}/volunteers`);
  return invitations.length;
}

export async function sendReminders(eventId: string) {
  const supabase = await createClient();

  // Get invitations that haven't applied yet
  const { data: pendingInvitations } = await supabase
    .from("volunteer_invitations")
    .select("email, name")
    .eq("event_id", eventId)
    .in("status", ["sent", "opened"]);

  if (!pendingInvitations || pendingInvitations.length === 0) return 0;

  const { data: event } = await supabase
    .from("events")
    .select("title, organization_id, slug, organization:organizations(slug)")
    .eq("id", eventId)
    .single();

  if (!event) throw new Error("Event not found");

  const { data: settings } = await supabase
    .from("volunteer_settings")
    .select("application_deadline")
    .eq("event_id", eventId)
    .single();

  const orgSlug = (event.organization as unknown as { slug: string })?.slug;
  const applicationUrl = orgSlug && event.slug
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/${orgSlug}/${event.slug}/volunteer`
    : null;

  // Filter out those who already applied
  const { data: applications } = await supabase
    .from("volunteer_applications")
    .select("email")
    .eq("event_id", eventId);

  const appliedEmails = new Set((applications ?? []).map((a) => a.email));
  const toRemind = pendingInvitations.filter((i) => !appliedEmails.has(i.email));

  for (const contact of toRemind) {
    await sendEmail({
      organizationId: event.organization_id,
      eventId,
      to: { email: contact.email, name: contact.name ?? undefined },
      subject: `Reminder: Volunteer at ${event.title}`,
      html: buildReminderEmail(
        contact.name ?? "there",
        event.title,
        applicationUrl,
        settings?.application_deadline
      ),
    }).catch(() => {});
  }

  revalidatePath(`/events/${eventId}/volunteers`);
  return toRemind.length;
}

export async function importContactsCsv(
  eventId: string,
  csvText: string
): Promise<{ email: string; name?: string }[]> {
  const MAX_CSV_SIZE = 1024 * 1024; // 1MB
  if (csvText.length > MAX_CSV_SIZE) throw new Error("CSV too large. Maximum size is 1MB.");

  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error("CSV must have headers and at least one row");

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const emailIdx = headers.indexOf("email");
  if (emailIdx === -1) throw new Error("CSV must have an 'email' column");
  const nameIdx = headers.indexOf("name");

  const contacts: { email: string; name?: string }[] = [];
  const seen = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const email = values[emailIdx];
    if (!email || !email.includes("@")) continue;
    if (seen.has(email.toLowerCase())) continue;
    seen.add(email.toLowerCase());

    contacts.push({
      email,
      name: nameIdx >= 0 ? values[nameIdx] : undefined,
    });
  }

  return contacts;
}

// ─── Public Application ──────────────────────────────────────

export async function submitApplication(
  eventId: string,
  data: {
    name: string;
    email: string;
    phone?: string;
    organization?: string;
    roleIds: string[];
    availability: { date: string; startTime?: string; endTime?: string }[];
    answers: { questionId: string; answerText: string }[];
  }
) {
  const supabase = await createClient();

  // Check settings
  const { data: settings } = await supabase
    .from("volunteer_settings")
    .select("is_published, application_deadline, auto_accept, auto_add_to_attendees")
    .eq("event_id", eventId)
    .single();

  if (!settings?.is_published) return { error: "Applications are not open" };
  if (
    settings.application_deadline &&
    new Date(settings.application_deadline) < new Date()
  ) {
    return { error: "Application deadline has passed" };
  }

  // Get user if authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Create application
  const status = settings.auto_accept ? "accepted" : "pending";
  const { data: application, error } = await supabase
    .from("volunteer_applications")
    .insert({
      event_id: eventId,
      user_id: user?.id ?? null,
      email: data.email,
      name: data.name,
      phone: data.phone ?? null,
      organization: data.organization ?? null,
      status,
      ...(status === "accepted" ? { accepted_at: new Date().toISOString() } : {}),
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return { error: "You have already applied for this event" };
    return { error: error.message };
  }

  // Insert role preferences, answers, availability in parallel
  await Promise.all([
    data.roleIds.length > 0
      ? supabase.from("volunteer_application_roles").insert(
          data.roleIds.map((roleId) => ({
            application_id: application.id,
            role_id: roleId,
          }))
        )
      : Promise.resolve(),
    data.answers.length > 0
      ? supabase.from("volunteer_application_answers").insert(
          data.answers.map((a) => ({
            application_id: application.id,
            question_id: a.questionId,
            answer_text: a.answerText,
          }))
        )
      : Promise.resolve(),
    data.availability.length > 0
      ? supabase.from("volunteer_application_availability").insert(
          data.availability.map((a) => ({
            application_id: application.id,
            available_date: a.date,
            start_time: a.startTime ?? null,
            end_time: a.endTime ?? null,
          }))
        )
      : Promise.resolve(),
  ]);

  // Update invitation status if exists
  await supabase
    .from("volunteer_invitations")
    .update({ status: "applied" })
    .eq("event_id", eventId)
    .eq("email", data.email);

  // If auto-accept, also auto-add to attendees if configured
  if (status === "accepted" && settings.auto_add_to_attendees) {
    await supabase.from("registrations").upsert(
      {
        event_id: eventId,
        email: data.email,
        name: data.name,
        status: "confirmed",
        source: "volunteer",
      },
      { onConflict: "event_id,email" }
    );
  }

  // Notify organizer (fire-and-forget to avoid blocking the response)
  void (async () => {
    const { data: event } = await supabase
      .from("events")
      .select("title, organization_id")
      .eq("id", eventId)
      .single();

    if (event) {
      const { data: orgMembers } = await supabase
        .from("organization_members")
        .select("user_id, users:user_id(email)")
        .eq("organization_id", event.organization_id)
        .in("role", ["owner", "admin"]);

      const memberEmails = (orgMembers ?? [])
        .map((m: any) => (m.users as any)?.email)
        .filter(Boolean);

      for (const email of memberEmails.slice(0, 5)) {
        await sendEmail({
          organizationId: event.organization_id,
          eventId,
          to: { email },
          subject: `New volunteer application from ${data.name}`,
          html: buildNewApplicationEmail(data.name, data.email, event.title),
        }).catch(() => {});
      }
    }
  })();

  return { error: null, application };
}

// ─── Email Templates ─────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildAcceptanceEmail(name: string, eventTitle: string): string {
  name = escapeHtml(name);
  eventTitle = escapeHtml(eventTitle);
  return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
    <h2>You're In!</h2>
    <p>Hi ${name},</p>
    <p>Great news! You've been accepted as a volunteer for <strong>${eventTitle}</strong>.</p>
    <p>The event organizer will be in touch with more details about your role and schedule.</p>
    <p>Thank you for volunteering!</p>
    <hr/>
    <p style="color:#666;font-size:12px">Sent from ${eventTitle}</p>
  </div>`;
}

function buildRejectionEmail(name: string, eventTitle: string): string {
  name = escapeHtml(name);
  eventTitle = escapeHtml(eventTitle);
  return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
    <h2>Thank You for Your Interest</h2>
    <p>Hi ${name},</p>
    <p>Thank you for your interest in volunteering at <strong>${eventTitle}</strong>.</p>
    <p>Unfortunately, we're unable to accommodate your application at this time. We appreciate your willingness to help and hope you enjoy the event!</p>
    <hr/>
    <p style="color:#666;font-size:12px">Sent from ${eventTitle}</p>
  </div>`;
}

function buildInvitationEmail(
  name: string,
  eventTitle: string,
  applicationUrl: string | null,
  customMessage?: string
): string {
  name = escapeHtml(name);
  eventTitle = escapeHtml(eventTitle);
  const messageBlock = customMessage
    ? `<p>${escapeHtml(customMessage)}</p>`
    : "";
  const linkBlock = applicationUrl
    ? `<p><a href="${applicationUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:6px">Apply Now</a></p>`
    : "";

  return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
    <h2>Volunteer at ${eventTitle}</h2>
    <p>Hi ${name},</p>
    <p>We'd love for you to volunteer at <strong>${eventTitle}</strong>!</p>
    ${messageBlock}
    ${linkBlock}
    <hr/>
    <p style="color:#666;font-size:12px">Sent from ${eventTitle}</p>
  </div>`;
}

function buildReminderEmail(
  name: string,
  eventTitle: string,
  applicationUrl: string | null,
  deadline: string | null
): string {
  name = escapeHtml(name);
  eventTitle = escapeHtml(eventTitle);
  const deadlineBlock = deadline
    ? `<p><strong>Applications close on ${new Date(deadline).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.</strong></p>`
    : "";
  const linkBlock = applicationUrl
    ? `<p><a href="${applicationUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:6px">Apply Now</a></p>`
    : "";

  return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
    <h2>Reminder: Volunteer at ${eventTitle}</h2>
    <p>Hi ${name},</p>
    <p>Just a friendly reminder — we're still looking for volunteers for <strong>${eventTitle}</strong>.</p>
    ${deadlineBlock}
    ${linkBlock}
    <hr/>
    <p style="color:#666;font-size:12px">Sent from ${eventTitle}</p>
  </div>`;
}

function buildNewApplicationEmail(
  applicantName: string,
  applicantEmail: string,
  eventTitle: string
): string {
  applicantName = escapeHtml(applicantName);
  applicantEmail = escapeHtml(applicantEmail);
  eventTitle = escapeHtml(eventTitle);
  return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
    <h2>New Volunteer Application</h2>
    <p>A new volunteer application has been submitted for <strong>${eventTitle}</strong>:</p>
    <ul>
      <li><strong>Name:</strong> ${applicantName}</li>
      <li><strong>Email:</strong> ${applicantEmail}</li>
    </ul>
    <p>Log in to your dashboard to review the application.</p>
    <hr/>
    <p style="color:#666;font-size:12px">Sent from ${eventTitle}</p>
  </div>`;
}

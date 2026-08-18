"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/features/emails/lib/send-email";
import { TEMPLATES } from "./templates";

// ─── Form CRUD ───────────────────────────────────────────────

export async function createConsentForm(
  eventId: string,
  data: {
    title: string;
    description?: string | null;
    audience?: "all" | "attendees" | "speakers" | "volunteers";
    require_before_checkin?: boolean;
  },
  templateKey?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { data: form, error } = await supabase
    .from("consent_forms")
    .insert({
      event_id: eventId,
      title: data.title,
      description: data.description ?? null,
      audience: data.audience ?? "all",
      require_before_checkin: data.require_before_checkin ?? false,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // If a template key is provided, insert template elements
  if (templateKey) {
    const template = TEMPLATES.find((t) => t.key === templateKey);
    if (template) {
      const elements = template.elements.map((el, i) => ({
        form_id: form.id,
        type: el.type,
        label: el.label,
        is_required: el.is_required,
        sort_order: i,
      }));

      await supabase.from("consent_form_elements").insert(elements);
    }
  }

  revalidatePath(`/events/${eventId}/consent-forms`);
  return form;
}

export async function updateConsentForm(
  eventId: string,
  formId: string,
  data: {
    title?: string;
    description?: string | null;
    audience?: "all" | "attendees" | "speakers" | "volunteers";
    require_before_checkin?: boolean;
    status?: "draft" | "published";
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { error } = await supabase
    .from("consent_forms")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", formId)
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/consent-forms`);
}

export async function deleteConsentForm(eventId: string, formId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { error } = await supabase
    .from("consent_forms")
    .delete()
    .eq("id", formId)
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/consent-forms`);
}

// ─── Element CRUD ────────────────────────────────────────────

export async function createElement(
  eventId: string,
  formId: string,
  data: {
    type: "description" | "checkbox" | "text" | "textarea" | "signature";
    label: string;
    is_required?: boolean;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  // Get max sort order
  const { data: maxSort } = await supabase
    .from("consent_form_elements")
    .select("sort_order")
    .eq("form_id", formId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const { data: element, error } = await supabase
    .from("consent_form_elements")
    .insert({
      form_id: formId,
      type: data.type,
      label: data.label,
      is_required: data.is_required ?? true,
      sort_order: (maxSort?.sort_order ?? -1) + 1,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/consent-forms`);
  return element;
}

export async function updateElement(
  eventId: string,
  elementId: string,
  data: {
    label?: string;
    is_required?: boolean;
    type?: "description" | "checkbox" | "text" | "textarea" | "signature";
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { error } = await supabase
    .from("consent_form_elements")
    .update(data)
    .eq("id", elementId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/consent-forms`);
}

export async function deleteElement(eventId: string, elementId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { error } = await supabase
    .from("consent_form_elements")
    .delete()
    .eq("id", elementId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/consent-forms`);
}

export async function reorderElements(
  eventId: string,
  elementIds: string[]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  for (let i = 0; i < elementIds.length; i++) {
    await supabase
      .from("consent_form_elements")
      .update({ sort_order: i })
      .eq("id", elementIds[i]);
  }

  revalidatePath(`/events/${eventId}/consent-forms`);
}

// ─── Submission ──────────────────────────────────────────────

export async function submitConsentForm(
  formId: string,
  data: {
    email: string;
    name: string;
    signed_name: string;
    answers: Record<string, unknown>;
  }
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  // Get the form to verify it's published and get event_id
  const { data: form, error: formError } = await supabase
    .from("consent_forms")
    .select("id, event_id, status, title")
    .eq("id", formId)
    .single();

  if (formError || !form) return { error: "Form not found" };
  if (form.status !== "published") return { error: "This form is not currently accepting submissions" };

  // Get user if authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("consent_form_submissions")
    .insert({
      form_id: formId,
      event_id: form.event_id,
      user_id: user?.id ?? null,
      email: data.email,
      name: data.name,
      signed_name: data.signed_name,
      answers: data.answers,
    });

  if (error) {
    if (error.code === "23505") return { error: "You have already signed this form" };
    return { error: error.message };
  }

  revalidatePath(`/events/${form.event_id}/consent-forms`);
  return { error: null };
}

// ─── Email ───────────────────────────────────────────────────

export async function sendConsentFormEmails(
  eventId: string,
  formId: string,
  recipients: { email: string; name?: string }[]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { data: form } = await supabase
    .from("consent_forms")
    .select("title, event_id")
    .eq("id", formId)
    .single();
  if (!form) throw new Error("Form not found");

  const { data: event } = await supabase
    .from("events")
    .select("title, organization_id, slug, organization:organizations(slug)")
    .eq("id", eventId)
    .single();
  if (!event) throw new Error("Event not found");

  const orgSlug = (event.organization as unknown as { slug: string })?.slug;
  const formUrl =
    orgSlug && event.slug
      ? `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/${orgSlug}/${event.slug}/consent/${formId}`
      : null;

  // Fire-and-forget email sending
  const emailRecipients = [...recipients];
  const eventTitle = event.title;
  const formTitle = form.title;
  const organizationId = event.organization_id;

  setTimeout(async () => {
    try {
      for (const recipient of emailRecipients) {
        await sendEmail({
          organizationId,
          eventId,
          to: { email: recipient.email, name: recipient.name },
          subject: `Action required: Please sign "${formTitle}" for ${eventTitle}`,
          html: buildFormRequestEmail(
            recipient.name ?? "there",
            formTitle,
            eventTitle,
            formUrl
          ),
        }).catch(() => {});
      }
    } catch {
      // Silently fail — notification emails are best-effort
    }
  }, 0);

  return recipients.length;
}

export async function sendConsentFormReminders(
  eventId: string,
  formId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { data: form } = await supabase
    .from("consent_forms")
    .select("title")
    .eq("id", formId)
    .single();
  if (!form) throw new Error("Form not found");

  const { data: event } = await supabase
    .from("events")
    .select("title, organization_id, slug, organization:organizations(slug)")
    .eq("id", eventId)
    .single();
  if (!event) throw new Error("Event not found");

  // Get registrations for this event
  const { data: registrations } = await supabase
    .from("registrations")
    .select("email, name")
    .eq("event_id", eventId);

  if (!registrations || registrations.length === 0) return 0;

  // Get existing submissions
  const { data: submissions } = await supabase
    .from("consent_form_submissions")
    .select("email")
    .eq("form_id", formId);

  const signedEmails = new Set((submissions ?? []).map((s) => s.email));
  const toRemind = registrations.filter((r) => !signedEmails.has(r.email));

  if (toRemind.length === 0) return 0;

  const orgSlug = (event.organization as unknown as { slug: string })?.slug;
  const formUrl =
    orgSlug && event.slug
      ? `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/${orgSlug}/${event.slug}/consent/${formId}`
      : null;

  const eventTitle = event.title;
  const formTitle = form.title;
  const organizationId = event.organization_id;
  const remindList = [...toRemind];

  // Fire-and-forget email sending
  setTimeout(async () => {
    try {
      for (const recipient of remindList) {
        await sendEmail({
          organizationId,
          eventId,
          to: { email: recipient.email, name: recipient.name ?? undefined },
          subject: `Reminder: Please sign "${formTitle}" for ${eventTitle}`,
          html: buildFormRequestEmail(
            recipient.name ?? "there",
            formTitle,
            eventTitle,
            formUrl
          ),
        }).catch(() => {});
      }
    } catch {
      // Silently fail — reminder emails are best-effort
    }
  }, 0);

  return toRemind.length;
}

// ─── CSV Export ──────────────────────────────────────────────

export async function exportSubmissionsCsv(
  eventId: string,
  formId: string
): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { data: submissions, error } = await supabase
    .from("consent_form_submissions")
    .select("*")
    .eq("form_id", formId)
    .eq("event_id", eventId)
    .order("signed_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!submissions || submissions.length === 0) return "No submissions found";

  // Get form elements to build answer columns
  const { data: elements } = await supabase
    .from("consent_form_elements")
    .select("id, label, type")
    .eq("form_id", formId)
    .order("sort_order");

  const answerElements = (elements ?? []).filter(
    (e) => e.type !== "description"
  );

  // Build CSV header
  const headers = [
    "Name",
    "Email",
    "Signed Name",
    "Signed At",
    ...answerElements.map((e) => e.label),
  ];

  const csvRows = [headers.map(escapeCsvField).join(",")];

  for (const sub of submissions) {
    const answers = (sub.answers ?? {}) as Record<string, unknown>;
    const row = [
      sub.name,
      sub.email,
      sub.signed_name,
      sub.signed_at,
      ...answerElements.map((e) => {
        const val = answers[e.id];
        if (val === true) return "Yes";
        if (val === false) return "No";
        return String(val ?? "");
      }),
    ];
    csvRows.push(row.map(escapeCsvField).join(","));
  }

  return csvRows.join("\n");
}

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ─── Check-in Query (server action wrapper) ─────────────────

export async function fetchPendingConsentForms(
  eventId: string,
  email: string
): Promise<{ id: string; title: string }[]> {
  const { getPendingConsentForms } = await import("./queries");
  const forms = await getPendingConsentForms(eventId, email);
  return forms.map((f) => ({ id: f.id, title: f.title }));
}

// ─── Email Template ──────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildFormRequestEmail(
  name: string,
  formTitle: string,
  eventTitle: string,
  formUrl: string | null
): string {
  name = escapeHtml(name);
  formTitle = escapeHtml(formTitle);
  eventTitle = escapeHtml(eventTitle);

  const linkBlock = formUrl
    ? `<p><a href="${formUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:6px">Sign Form</a></p>`
    : "";

  return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
    <h2>Action Required: ${formTitle}</h2>
    <p>Hi ${name},</p>
    <p>You are required to sign <strong>${formTitle}</strong> for <strong>${eventTitle}</strong>.</p>
    <p>Please review and sign the form at your earliest convenience.</p>
    ${linkBlock}
    <hr/>
    <p style="color:#666;font-size:12px">Sent from ${eventTitle}</p>
  </div>`;
}

"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";
import { sendEmail, substituteVariables } from "./lib/send-email";
import { getSegmentedRecipients } from "./lib/segments";

export async function createEmailTemplate(data: {
  organizationId: string;
  name: string;
  subject: string;
  bodyHtml: string;
  type: string;
}) {
  const supabase = await createClient();

  const { data: template, error } = await supabase
    .from("email_templates")
    .insert({
      organization_id: data.organizationId,
      name: data.name,
      subject: data.subject,
      body_html: data.bodyHtml,
      type: data.type,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return template;
}

export async function updateEmailTemplate(
  templateId: string,
  data: {
    name?: string;
    subject?: string;
    bodyHtml?: string;
    type?: string;
  }
) {
  const supabase = await createClient();

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.name !== undefined) update.name = data.name;
  if (data.subject !== undefined) update.subject = data.subject;
  if (data.bodyHtml !== undefined) update.body_html = data.bodyHtml;
  if (data.type !== undefined) update.type = data.type;

  const { error } = await supabase
    .from("email_templates")
    .update(update)
    .eq("id", templateId);

  if (error) throw new Error(error.message);
}

export async function deleteEmailTemplate(templateId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("email_templates")
    .delete()
    .eq("id", templateId);

  if (error) throw new Error(error.message);
}

export async function createEmailAutomation(data: {
  eventId: string;
  trigger: string;
  templateId: string;
  enabled?: boolean;
}) {
  const supabase = await createClient();

  const { data: automation, error } = await supabase
    .from("email_automations")
    .insert({
      event_id: data.eventId,
      trigger: data.trigger,
      template_id: data.templateId,
      enabled: data.enabled ?? true,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${data.eventId}/emails`);
  return automation;
}

export async function toggleEmailAutomation(automationId: string, enabled: boolean) {
  const supabase = await createClient();

  const { data: automation, error: fetchError } = await supabase
    .from("email_automations")
    .select("event_id")
    .eq("id", automationId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const { error } = await supabase
    .from("email_automations")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("id", automationId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${automation.event_id}/emails`);
}

export async function deleteEmailAutomation(automationId: string) {
  const supabase = await createClient();

  const { data: automation, error: fetchError } = await supabase
    .from("email_automations")
    .select("event_id")
    .eq("id", automationId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const { error } = await supabase
    .from("email_automations")
    .delete()
    .eq("id", automationId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${automation.event_id}/emails`);
}

export async function sendBroadcastEmail(data: {
  eventId: string;
  subject: string;
  bodyHtml: string;
  filters?: {
    ticket_type_ids?: string[];
    statuses?: string[];
    checked_in?: boolean;
  };
}) {
  const supabase = await createClient();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title, organization_id")
    .eq("id", data.eventId)
    .single();

  if (eventError || !event) throw new Error("Event not found");

  const recipients = await getSegmentedRecipients(data.eventId, data.filters);

  if (recipients.length === 0) {
    throw new Error("No recipients match the selected filters");
  }

  let sentCount = 0;
  let failedCount = 0;

  for (let i = 0; i < recipients.length; i += 50) {
    const batch = recipients.slice(i, i + 50);

    const results = await Promise.allSettled(
      batch.map((recipient) => {
        const variables: Record<string, string> = {
          attendee_name: recipient.name ?? "Attendee",
          event_name: event.title,
        };
        const subject = substituteVariables(data.subject, variables);
        const html = substituteVariables(data.bodyHtml, variables);

        return sendEmail({
          organizationId: event.organization_id,
          eventId: data.eventId,
          to: { email: recipient.email, name: recipient.name },
          subject,
          html,
        });
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") sentCount++;
      else failedCount++;
    }
  }

  revalidatePath(`/events/${data.eventId}/emails`);

  return { sentCount, failedCount, totalRecipients: recipients.length };
}

export async function sendRegistrationConfirmationEmail(
  eventId: string,
  registration: { name: string; email: string; ticketTypeName: string; qrCode: string }
) {
  // Use service role client — this may be called by anonymous/non-org users during registration
  const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("title, start_date, slug, organization_id, organizations(slug)")
    .eq("id", eventId)
    .single();

  if (!event) {
    console.error("[Registration Email] Event not found:", eventId, eventError);
    return;
  }
  console.log("[Registration Email] Event found, sending email to:", registration.email);

  const { data: automation } = await supabase
    .from("email_automations")
    .select("enabled")
    .eq("event_id", eventId)
    .eq("trigger", "on_registration")
    .single();

  // If an automation row exists and is explicitly disabled, skip
  if (automation && !automation.enabled) return;

  const orgs = event.organizations as unknown as { slug: string }[] | null;
  const orgSlug = orgs?.[0]?.slug ?? "";
  const eventUrl = `/${orgSlug}/${event.slug}`;

  const { render } = await import("@react-email/components");
  const { RegistrationConfirmation } = await import("./lib/templates/registration-confirmation");

  const html = await render(
    RegistrationConfirmation({
      attendeeName: registration.name,
      eventName: event.title,
      eventDate: new Date(event.start_date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      eventUrl,
      ticketType: registration.ticketTypeName,
      qrCode: registration.qrCode,
    })
  );

  try {
    await sendEmail({
      organizationId: event.organization_id,
      eventId,
      to: { email: registration.email, name: registration.name },
      subject: `You're registered for ${event.title}!`,
      html,
    });
  } catch (err) {
    console.error("Failed to send registration confirmation email:", err);
  }
}

export async function createContactList(data: {
  organizationId: string;
  name: string;
}) {
  const supabase = await createClient();

  const { data: list, error } = await supabase
    .from("contact_lists")
    .insert({
      organization_id: data.organizationId,
      name: data.name,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return list;
}

export async function deleteContactList(listId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("contact_lists")
    .delete()
    .eq("id", listId);

  if (error) throw new Error(error.message);
}

export async function uploadContacts(
  contactListId: string,
  contacts: { email: string; firstName?: string; lastName?: string }[]
) {
  const supabase = await createClient();

  const rows = contacts.map((c) => ({
    contact_list_id: contactListId,
    email: c.email.toLowerCase().trim(),
    first_name: c.firstName ?? null,
    last_name: c.lastName ?? null,
  }));

  const { data, error } = await supabase
    .from("contacts")
    .upsert(rows, { onConflict: "contact_list_id,email", ignoreDuplicates: true })
    .select();

  if (error) throw new Error(error.message);
  return { count: data?.length ?? 0 };
}

export async function createCampaign(data: {
  eventId: string;
  subject: string;
  bodyHtml: string;
  recipientSource: "contact_list" | "registrants";
  contactListId?: string;
  segmentFilters?: Record<string, unknown>;
  senderName?: string;
  replyTo?: string;
  includeCta?: boolean;
}) {
  const supabase = await createClient();

  const { data: campaign, error } = await supabase
    .from("email_campaigns")
    .insert({
      event_id: data.eventId,
      subject: data.subject,
      body_html: data.bodyHtml,
      recipient_source: data.recipientSource,
      contact_list_id: data.contactListId ?? null,
      segment_filters: data.segmentFilters ?? null,
      sender_name: data.senderName ?? null,
      reply_to: data.replyTo ?? null,
      include_cta: data.includeCta ?? true,
      status: "draft",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return campaign;
}

export async function updateCampaign(
  campaignId: string,
  data: {
    subject?: string;
    bodyHtml?: string;
    recipientSource?: string;
    contactListId?: string | null;
    segmentFilters?: Record<string, unknown> | null;
    senderName?: string;
    replyTo?: string;
    includeCta?: boolean;
  }
) {
  const supabase = await createClient();

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.subject !== undefined) update.subject = data.subject;
  if (data.bodyHtml !== undefined) update.body_html = data.bodyHtml;
  if (data.recipientSource !== undefined) update.recipient_source = data.recipientSource;
  if (data.contactListId !== undefined) update.contact_list_id = data.contactListId;
  if (data.segmentFilters !== undefined) update.segment_filters = data.segmentFilters;
  if (data.senderName !== undefined) update.sender_name = data.senderName;
  if (data.replyTo !== undefined) update.reply_to = data.replyTo;
  if (data.includeCta !== undefined) update.include_cta = data.includeCta;

  const { error } = await supabase
    .from("email_campaigns")
    .update(update)
    .eq("id", campaignId);

  if (error) throw new Error(error.message);
}

export async function sendTestEmail(data: {
  eventId: string;
  subject: string;
  bodyHtml: string;
  recipientEmail: string;
}) {
  const supabase = await createClient();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title, organization_id, start_date, slug, location, organizations(slug)")
    .eq("id", data.eventId)
    .single();

  if (eventError || !event) throw new Error("Event not found");

  const variables: Record<string, string> = {
    first_name: "Test User",
    event_name: event.title,
    event_date: new Date(event.start_date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    event_url: `/${(event.organizations as any)?.[0]?.slug ?? ""}/${event.slug}`,
  };

  const subject = substituteVariables(data.subject, variables);
  const html = substituteVariables(data.bodyHtml, variables);

  await sendEmail({
    organizationId: event.organization_id,
    eventId: data.eventId,
    to: { email: data.recipientEmail, name: "Test" },
    subject: `[TEST] ${subject}`,
    html,
  });
}

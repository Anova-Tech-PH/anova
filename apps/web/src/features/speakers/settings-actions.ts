"use server";

import { randomBytes } from "crypto";
import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";
import { sendEmail, substituteVariables } from "../emails/lib/send-email";
import type { FormFieldConfig } from "./settings-constants";

export async function saveSpeakerFormSettings(
  eventId: string,
  data: {
    emailSubject: string;
    emailBody: string;
    notificationPreference: string;
    fields: FormFieldConfig[];
  }
) {
  const supabase = await createClient();

  // 1. Upsert settings
  const { error: settingsError } = await supabase
    .from("speaker_form_settings")
    .upsert(
      {
        event_id: eventId,
        email_subject: data.emailSubject,
        email_body: data.emailBody,
        notification_preference: data.notificationPreference,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_id" }
    );

  if (settingsError) throw new Error(settingsError.message);

  // 2. Delete existing fields and re-insert
  const { error: deleteError } = await supabase
    .from("speaker_form_fields")
    .delete()
    .eq("event_id", eventId);

  if (deleteError) throw new Error(deleteError.message);

  const fieldRows = data.fields.map((f) => ({
    event_id: eventId,
    ...f,
  }));

  const { error: insertError } = await supabase
    .from("speaker_form_fields")
    .insert(fieldRows);

  if (insertError) throw new Error(insertError.message);

  revalidatePath(`/events/${eventId}/speakers/settings`);
}

export async function sendSpeakerFormInvitation(eventId: string, speakerId: string) {
  const supabase = await createClient();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("organization_id, title")
    .eq("id", eventId)
    .single();

  if (eventError || !event) throw new Error("Event not found");

  const { data: speaker, error: speakerError } = await supabase
    .from("speakers")
    .select("id, name, email")
    .eq("id", speakerId)
    .single();

  if (speakerError || !speaker) throw new Error("Speaker not found");
  if (!speaker.email) throw new Error("Speaker does not have an email address");

  const { data: settings } = await supabase
    .from("speaker_form_settings")
    .select("email_subject, email_body")
    .eq("event_id", eventId)
    .single();

  const emailSubject = settings?.email_subject
    ?? "{{speaker_name}}, please submit your speaker info for {{event_name}}";
  const emailBody = settings?.email_body ?? "";

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const { data: tokenRow, error: tokenError } = await supabase
    .from("speaker_form_tokens")
    .insert({
      event_id: eventId,
      speaker_id: speakerId,
      token,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (tokenError) throw new Error(tokenError.message);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.E2E_BASE_URL || "http://localhost:3000";
  const formLink = `${baseUrl}/speakers/form/${tokenRow.token}`;

  const variables = {
    speaker_name: speaker.name,
    event_name: event.title,
    form_link: formLink,
  };

  const subject = substituteVariables(emailSubject, variables);
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { SpeakerFormInvitation } = await import("../emails/lib/templates/speaker-form-invitation");
  const html = renderToStaticMarkup(
    SpeakerFormInvitation({
      speakerName: speaker.name,
      eventName: event.title,
      formLink,
      bodyText: substituteVariables(emailBody, variables),
    })
  );

  await sendEmail({
    organizationId: event.organization_id,
    eventId,
    to: { email: speaker.email, name: speaker.name },
    subject,
    html,
  });

  revalidatePath(`/events/${eventId}/speakers`);
}

export async function sendSpeakerFormToAll(eventId: string) {
  const supabase = await createClient();

  const { data: speakers, error } = await supabase
    .from("speakers")
    .select("id, email")
    .eq("event_id", eventId)
    .not("email", "is", null);

  if (error) throw new Error(error.message);
  if (!speakers || speakers.length === 0) throw new Error("No speakers with email addresses");

  const results = { sent: 0, failed: 0 };
  for (const speaker of speakers) {
    try {
      await sendSpeakerFormInvitation(eventId, speaker.id);
      results.sent++;
    } catch {
      results.failed++;
    }
  }

  return results;
}

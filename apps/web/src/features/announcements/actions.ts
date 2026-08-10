"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";
import { sendEmail, substituteVariables } from "@/features/emails/lib/send-email";
import { getSegmentedRecipients } from "@/features/emails/lib/segments";

export async function createAnnouncement(
  eventId: string,
  data: {
    subject: string;
    body: string;
    target_audience?: { type: string; ticket_type_ids?: string[] };
    channels?: string[];
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { data: announcement, error } = await supabase
    .from("announcements")
    .insert({
      event_id: eventId,
      author_id: user.id,
      subject: data.subject,
      body: data.body,
      target_audience: data.target_audience ?? { type: "all" },
      channels: data.channels ?? ["in_app"],
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/announcements`);
  return announcement;
}

export async function updateAnnouncement(
  eventId: string,
  announcementId: string,
  data: { subject?: string; body?: string; target_audience?: Record<string, unknown>; channels?: string[] }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("announcements")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", announcementId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/announcements`);
}

export async function deleteAnnouncement(eventId: string, announcementId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", announcementId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/announcements`);
}

export async function sendAnnouncement(eventId: string, announcementId: string) {
  const supabase = await createClient();

  const { data: announcement, error: fetchError } = await supabase
    .from("announcements")
    .select("*")
    .eq("id", announcementId)
    .single();

  if (fetchError || !announcement) throw new Error("Announcement not found");

  const { data: event } = await supabase
    .from("events")
    .select("title, organization_id")
    .eq("id", eventId)
    .single();

  if (!event) throw new Error("Event not found");

  const channels: string[] = announcement.channels ?? ["in_app"];

  // Send email if channel includes email
  if (channels.includes("email")) {
    const audience = announcement.target_audience as { type: string; ticket_type_ids?: string[] };
    const filters = audience.type === "ticket_types"
      ? { ticket_type_ids: audience.ticket_type_ids }
      : undefined;

    const recipients = await getSegmentedRecipients(eventId, filters);

    for (let i = 0; i < recipients.length; i += 50) {
      const batch = recipients.slice(i, i + 50);
      await Promise.allSettled(
        batch.map((recipient) =>
          sendEmail({
            organizationId: event.organization_id,
            eventId,
            to: { email: recipient.email, name: recipient.name },
            subject: substituteVariables(announcement.subject, {
              attendee_name: recipient.name ?? "Attendee",
              event_name: event.title,
            }),
            html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
              <h2>${announcement.subject}</h2>
              <div>${announcement.body}</div>
              <hr/>
              <p style="color:#666;font-size:12px">Sent from ${event.title}</p>
            </div>`,
          })
        )
      );
    }
  }

  // Mark as sent
  const { error: updateError } = await supabase
    .from("announcements")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", announcementId);

  if (updateError) throw new Error(updateError.message);
  revalidatePath(`/events/${eventId}/announcements`);
}

export async function markAnnouncementRead(announcementId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("announcement_reads")
    .upsert({ announcement_id: announcementId, user_id: user.id })
    .select();
}

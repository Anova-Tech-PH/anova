import { createClient } from "@supabase/supabase-js";
import { getResend } from "@/features/emails/lib/resend";
import { render } from "@react-email/components";
import { RecoveryEmail } from "@/features/emails/lib/templates/recovery-email";
import { generateUnsubscribeToken } from "@/features/emails/lib/unsubscribe";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Recovery email schedule: additional delay in hours after first email
const RECOVERY_SCHEDULE = [0, 24, 72];

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();
  let sent = 0;
  let skipped = 0;

  // Find events with recovery enabled
  const { data: events } = await supabase
    .from("events")
    .select("id, title, start_date, end_date, venue_name, slug, organization_id, recovery_delay_hours, recovery_email_count, organizations(slug)")
    .eq("recovery_enabled", true)
    .eq("status", "published");

  if (!events || events.length === 0) {
    return Response.json({ ok: true, sent: 0, skipped: 0 });
  }

  for (const event of events) {
    // Don't send recovery emails after the event has ended
    if (new Date(event.end_date) < now) continue;

    // Find pending intents that still need emails
    const { data: intents } = await supabase
      .from("registration_intents")
      .select("id, email, name, ticket_type_id, recovery_emails_sent, last_recovery_email_at, created_at, ticket_types(name)")
      .eq("event_id", event.id)
      .eq("status", "pending")
      .lt("recovery_emails_sent", event.recovery_email_count);

    if (!intents || intents.length === 0) continue;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.evenstry.com";
    const orgSlug = (event.organizations as any)?.slug ?? "";

    for (const intent of intents) {
      const emailIndex = intent.recovery_emails_sent;
      const delayHours = event.recovery_delay_hours + (RECOVERY_SCHEDULE[emailIndex] ?? 0);
      const sendAfter = new Date(intent.created_at);
      sendAfter.setHours(sendAfter.getHours() + delayHours);

      // Not yet time to send
      if (now < sendAfter) {
        skipped++;
        continue;
      }

      // Avoid duplicate sends within 1 hour
      if (intent.last_recovery_email_at) {
        const lastSent = new Date(intent.last_recovery_email_at);
        if (now.getTime() - lastSent.getTime() < 60 * 60 * 1000) {
          skipped++;
          continue;
        }
      }

      // Check if they've since registered (belt and suspenders)
      const { data: existingReg } = await supabase
        .from("registrations")
        .select("id")
        .eq("event_id", event.id)
        .eq("email", intent.email)
        .in("status", ["confirmed", "checked_in"])
        .limit(1);

      if (existingReg && existingReg.length > 0) {
        await supabase
          .from("registration_intents")
          .update({ status: "converted", updated_at: now.toISOString() })
          .eq("id", intent.id);
        continue;
      }

      // Build URLs
      const registrationUrl = `${baseUrl}/${orgSlug}/${event.slug}/register?intent=${intent.id}`;
      const unsubToken = await generateUnsubscribeToken({ email: intent.email });
      const unsubscribeUrl = `${baseUrl}/api/unsubscribe?token=${unsubToken}`;

      const ticketName = (intent.ticket_types as any)?.name ?? "General";

      const html = await render(
        RecoveryEmail({
          eventName: event.title,
          eventDate: new Date(event.start_date).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }),
          venueName: event.venue_name ?? undefined,
          ticketName,
          registrationUrl,
          unsubscribeUrl,
        })
      );

      const subject = emailIndex === 0
        ? `Complete your registration for ${event.title}`
        : emailIndex === 1
          ? `Your spot is still available — ${event.title}`
          : `Last chance to register for ${event.title}`;

      const { data: sentData, error: sendError } = await getResend().emails.send({
        from: process.env.EMAIL_FROM || "Evenstry <onboarding@resend.dev>",
        to: intent.email,
        subject,
        html,
      });

      // Log to email_logs
      await supabase.from("email_logs").insert({
        organization_id: event.organization_id,
        event_id: event.id,
        recipient_email: intent.email,
        recipient_name: intent.name,
        subject,
        status: sendError ? "failed" : "sent",
        resend_id: sentData?.id ?? null,
        sent_at: sendError ? null : now.toISOString(),
        error: sendError?.message ?? null,
      });

      // Update intent tracking
      await supabase
        .from("registration_intents")
        .update({
          recovery_emails_sent: intent.recovery_emails_sent + 1,
          last_recovery_email_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("id", intent.id);

      if (!sendError) sent++;
    }
  }

  return Response.json({ ok: true, sent, skipped, timestamp: now.toISOString() });
}

import { createClient } from "@supabase/supabase-js";
import { getResend } from "@/features/emails/lib/resend";
import { render } from "@react-email/components";
import { EventReminder } from "@/features/emails/lib/templates/event-reminder";
import { PostEvent } from "@/features/emails/lib/templates/post-event";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();

  await processReminders(supabase, now);
  await processPostEvent(supabase, now);

  return Response.json({ ok: true, timestamp: now.toISOString() });
}

async function processReminders(supabase: ReturnType<typeof createServiceClient>, now: Date) {
  const triggers = [
    { trigger: "pre_event_24h", hoursAhead: 24, timeUntil: "in 24 hours" },
    { trigger: "pre_event_1h", hoursAhead: 1, timeUntil: "in 1 hour" },
  ];

  for (const { trigger, hoursAhead, timeUntil } of triggers) {
    const windowStart = new Date(now.getTime() + (hoursAhead - 0.5) * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + (hoursAhead + 0.5) * 60 * 60 * 1000);

    const { data: automations } = await supabase
      .from("email_automations")
      .select("id, event_id, events(id, title, start_date, slug, organization_id, organizations(slug))")
      .eq("trigger", trigger)
      .eq("enabled", true);

    if (!automations) continue;

    for (const auto of automations) {
      const event = auto.events as any;
      if (!event) continue;

      const startDate = new Date(event.start_date);
      if (startDate < windowStart || startDate > windowEnd) continue;

      const { data: registrations } = await supabase
        .from("registrations")
        .select("id, name, email")
        .eq("event_id", event.id)
        .in("status", ["confirmed"])
        .eq("unsubscribed", false);

      if (!registrations || registrations.length === 0) continue;

      for (const reg of registrations) {
        const { data: existing } = await supabase
          .from("email_logs")
          .select("id")
          .eq("event_id", event.id)
          .eq("recipient_email", reg.email)
          .like("subject", `%${trigger}%`)
          .limit(1);

        if (existing && existing.length > 0) continue;

        const html = await render(
          EventReminder({
            attendeeName: reg.name ?? "Attendee",
            eventName: event.title,
            eventDate: new Date(event.start_date).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }),
            eventUrl: `/${(event.organizations as any)?.slug}/${event.slug}`,
            timeUntil,
          })
        );

        const subject = `[Reminder] ${event.title} starts ${timeUntil}`;

        const { data: sent, error } = await getResend().emails.send({
          from: "Attendly <noreply@attendly.app>",
          to: reg.email,
          subject,
          html,
        });

        await supabase.from("email_logs").insert({
          organization_id: event.organization_id,
          event_id: event.id,
          recipient_email: reg.email,
          recipient_name: reg.name,
          subject,
          status: error ? "failed" : "sent",
          resend_id: sent?.id ?? null,
          sent_at: error ? null : new Date().toISOString(),
          error: error?.message ?? null,
        });
      }
    }
  }
}

async function processPostEvent(supabase: ReturnType<typeof createServiceClient>, now: Date) {
  const windowStart = new Date(now.getTime() - 60 * 60 * 1000);

  const { data: automations } = await supabase
    .from("email_automations")
    .select("id, event_id, events(id, title, end_date, organization_id)")
    .eq("trigger", "post_event")
    .eq("enabled", true);

  if (!automations) return;

  for (const auto of automations) {
    const event = auto.events as any;
    if (!event) continue;

    const endDate = new Date(event.end_date);
    if (endDate < windowStart || endDate > now) continue;

    const { data: registrations } = await supabase
      .from("registrations")
      .select("id, name, email")
      .eq("event_id", event.id)
      .eq("status", "checked_in")
      .eq("unsubscribed", false);

    if (!registrations || registrations.length === 0) continue;

    for (const reg of registrations) {
      const { data: existing } = await supabase
        .from("email_logs")
        .select("id")
        .eq("event_id", event.id)
        .eq("recipient_email", reg.email)
        .like("subject", "%Thanks for attending%")
        .limit(1);

      if (existing && existing.length > 0) continue;

      const html = await render(
        PostEvent({
          attendeeName: reg.name ?? "Attendee",
          eventName: event.title,
        })
      );

      const subject = `Thanks for attending ${event.title}!`;

      const { data: sent, error } = await getResend().emails.send({
        from: "Attendly <noreply@attendly.app>",
        to: reg.email,
        subject,
        html,
      });

      await supabase.from("email_logs").insert({
        organization_id: event.organization_id,
        event_id: event.id,
        recipient_email: reg.email,
        recipient_name: reg.name,
        subject,
        status: error ? "failed" : "sent",
        resend_id: sent?.id ?? null,
        sent_at: error ? null : new Date().toISOString(),
        error: error?.message ?? null,
      });
    }
  }
}

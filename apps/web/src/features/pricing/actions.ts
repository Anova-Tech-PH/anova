"use server";

import { createClient } from "@attendly/ui/supabase/server";

type QuoteRequestInput = {
  name: string;
  email: string;
  organizationName?: string;
  eventName: string;
  phone?: string;
  eventFormat: string;
  eventDuration: string;
  expectedAttendees: string;
  eventsPerYear: string;
  budgetRange?: string;
  message?: string;
};

export async function submitQuoteRequest(input: QuoteRequestInput) {
  if (
    !input.name ||
    !input.email ||
    !input.eventName ||
    !input.eventFormat ||
    !input.eventDuration ||
    !input.expectedAttendees ||
    !input.eventsPerYear
  ) {
    return { error: "Please fill in all required fields." };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(input.email)) {
    return { error: "Please enter a valid email address." };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("quote_requests").insert({
    name: input.name,
    email: input.email,
    organization_name: input.organizationName || null,
    event_name: input.eventName,
    phone: input.phone || null,
    event_format: input.eventFormat,
    event_duration: input.eventDuration,
    expected_attendees: input.expectedAttendees,
    events_per_year: input.eventsPerYear,
    budget_range: input.budgetRange || null,
    message: input.message || null,
  });

  if (error) {
    console.error("Quote request insert error:", error);
    return { error: "Something went wrong. Please try again." };
  }

  // Send admin notification email (fire-and-forget)
  // Uses getResend() directly since this is a system-level email
  // not tied to any organization or event.
  try {
    const { getResend } = await import("@/features/emails/lib/resend");
    const { render } = await import("@react-email/components");
    const { QuoteRequestNotificationEmail } = await import(
      "@/features/emails/lib/templates/quote-request-notification"
    );

    const html = await render(
      QuoteRequestNotificationEmail({
        name: input.name,
        email: input.email,
        organizationName: input.organizationName,
        eventName: input.eventName,
        phone: input.phone,
        eventFormat: input.eventFormat,
        eventDuration: input.eventDuration,
        expectedAttendees: input.expectedAttendees,
        eventsPerYear: input.eventsPerYear,
        budgetRange: input.budgetRange,
        message: input.message,
      })
    );

    const defaultFrom =
      process.env.EMAIL_FROM || "Eventriv <noreply@eventriv.com>";

    await getResend().emails.send({
      from: defaultFrom,
      to: process.env.ADMIN_EMAIL || "info@eventriv.com",
      subject: `New Quote Request: ${input.eventName}`,
      html,
    });
  } catch (emailError) {
    console.error("Failed to send quote notification email:", emailError);
  }

  return { success: true };
}

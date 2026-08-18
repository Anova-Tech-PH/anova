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

const VALID_EVENT_FORMATS = ["In-person", "Virtual", "Hybrid"];
const VALID_EVENT_DURATIONS = ["Half day", "1 day", "Multiple days"];
const VALID_EXPECTED_ATTENDEES = [
  "Under 100",
  "100-200",
  "200-500",
  "500-2,000",
  "2,000+",
];
const VALID_EVENTS_PER_YEAR = ["1-2", "3-5", "6-10", "10+"];
const VALID_BUDGET_RANGES = [
  "Under $500",
  "$500-$1,000",
  "$1,000-$2,500",
  "$2,500+",
  "Not sure yet",
];

const MAX_LENGTHS: Record<string, number> = {
  name: 200,
  email: 320,
  organizationName: 300,
  eventName: 500,
  phone: 30,
  message: 5000,
};

function trimAndLimit(value: string | undefined, field: string): string {
  if (!value) return "";
  const trimmed = value.trim();
  const max = MAX_LENGTHS[field];
  return max ? trimmed.slice(0, max) : trimmed;
}

export async function submitQuoteRequest(input: QuoteRequestInput) {
  // Trim and enforce max lengths
  const name = trimAndLimit(input.name, "name");
  const email = trimAndLimit(input.email, "email");
  const organizationName = trimAndLimit(input.organizationName, "organizationName");
  const eventName = trimAndLimit(input.eventName, "eventName");
  const phone = trimAndLimit(input.phone, "phone");
  const eventFormat = input.eventFormat?.trim() ?? "";
  const eventDuration = input.eventDuration?.trim() ?? "";
  const expectedAttendees = input.expectedAttendees?.trim() ?? "";
  const eventsPerYear = input.eventsPerYear?.trim() ?? "";
  const budgetRange = input.budgetRange?.trim() ?? "";
  const message = trimAndLimit(input.message, "message");

  if (
    !name ||
    !email ||
    !eventName ||
    !eventFormat ||
    !eventDuration ||
    !expectedAttendees ||
    !eventsPerYear
  ) {
    return { error: "Please fill in all required fields." };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  // Validate enum fields
  if (!VALID_EVENT_FORMATS.includes(eventFormat)) {
    return { error: "Invalid event format selected." };
  }
  if (!VALID_EVENT_DURATIONS.includes(eventDuration)) {
    return { error: "Invalid event duration selected." };
  }
  if (!VALID_EXPECTED_ATTENDEES.includes(expectedAttendees)) {
    return { error: "Invalid attendee range selected." };
  }
  if (!VALID_EVENTS_PER_YEAR.includes(eventsPerYear)) {
    return { error: "Invalid events per year selected." };
  }
  if (budgetRange && !VALID_BUDGET_RANGES.includes(budgetRange)) {
    return { error: "Invalid budget range selected." };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("quote_requests").insert({
    name,
    email,
    organization_name: organizationName || null,
    event_name: eventName,
    phone: phone || null,
    event_format: eventFormat,
    event_duration: eventDuration,
    expected_attendees: expectedAttendees,
    events_per_year: eventsPerYear,
    budget_range: budgetRange || null,
    message: message || null,
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
        name,
        email,
        organizationName: organizationName || undefined,
        eventName,
        phone: phone || undefined,
        eventFormat,
        eventDuration,
        expectedAttendees,
        eventsPerYear,
        budgetRange: budgetRange || undefined,
        message: message || undefined,
      })
    );

    const defaultFrom =
      process.env.EMAIL_FROM || "Eventriv <noreply@eventriv.com>";

    const truncatedEventName =
      eventName.length > 100 ? eventName.slice(0, 100) + "..." : eventName;

    await getResend().emails.send({
      from: defaultFrom,
      to: process.env.ADMIN_EMAIL || "info@eventriv.com",
      subject: `New Quote Request: ${truncatedEventName}`,
      html,
    });
  } catch (emailError) {
    console.error("Failed to send quote notification email:", emailError);
  }

  return { success: true };
}

import { getResend } from "./resend";
import { createClient } from "@/shared/utils/supabase/server";

type SendEmailParams = {
  organizationId: string;
  eventId: string;
  templateId?: string;
  to: { email: string; name?: string };
  subject: string;
  html: string;
};

export async function sendEmail(params: SendEmailParams) {
  const supabase = await createClient();

  const { data, error: sendError } = await getResend().emails.send({
    from: "Attendly <noreply@attendly.app>",
    to: params.to.email,
    subject: params.subject,
    html: params.html,
  });

  const status = sendError ? "failed" : "sent";

  await supabase.from("email_logs").insert({
    organization_id: params.organizationId,
    event_id: params.eventId,
    template_id: params.templateId ?? null,
    recipient_email: params.to.email,
    recipient_name: params.to.name ?? null,
    subject: params.subject,
    status,
    resend_id: data?.id ?? null,
    sent_at: sendError ? null : new Date().toISOString(),
    error: sendError?.message ?? null,
  });

  if (sendError) {
    throw new Error(`Failed to send email: ${sendError.message}`);
  }

  return data;
}

export function substituteVariables(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? "");
}

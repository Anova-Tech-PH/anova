import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { getResend } from "./resend";

type SendEmailParams = {
  organizationId: string;
  eventId: string;
  templateId?: string;
  campaignId?: string;
  to: { email: string; name?: string };
  subject: string;
  html: string;
  senderName?: string;
  replyTo?: string;
};

function getServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function sendEmail(params: SendEmailParams) {
  const defaultFrom = process.env.EMAIL_FROM || "Eventriv <noreply@eventriv.com>";
  const fromAddress = params.senderName
    ? `${params.senderName} <${defaultFrom.match(/<(.+)>/)?.[1] ?? defaultFrom}>`
    : defaultFrom;

  const { data, error: sendError } = await getResend().emails.send({
    from: fromAddress,
    to: params.to.email,
    subject: params.subject,
    html: params.html,
    ...(params.replyTo ? { reply_to: params.replyTo } : {}),
  });

  // Use service role client for logging — this runs server-side
  // and the calling user may not have RLS access to email_logs
  const supabase = getServiceClient();

  await supabase.from("email_logs").insert({
    organization_id: params.organizationId,
    event_id: params.eventId,
    template_id: params.templateId ?? null,
    campaign_id: params.campaignId ?? null,
    recipient_email: params.to.email,
    recipient_name: params.to.name ?? null,
    subject: params.subject,
    status: sendError ? "failed" : "sent",
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

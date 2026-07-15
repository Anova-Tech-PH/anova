import { z } from "zod";

export const createEmailTemplateSchema = z.object({
  organization_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  subject: z.string().min(1).max(500),
  body_html: z.string().min(1),
  type: z.enum(["transactional", "marketing"]).default("transactional"),
});

export const sendBroadcastSchema = z.object({
  event_id: z.string().uuid(),
  subject: z.string().min(1).max(500),
  body_html: z.string().min(1),
  filters: z.object({
    ticket_type_ids: z.array(z.string().uuid()).optional(),
    statuses: z.array(z.enum(["pending", "confirmed", "cancelled", "checked_in"])).optional(),
    checked_in: z.boolean().optional(),
  }).optional(),
});

export const createAutomationSchema = z.object({
  event_id: z.string().uuid(),
  trigger: z.enum(["on_registration", "pre_event_24h", "pre_event_1h", "post_event"]),
  template_id: z.string().uuid(),
  enabled: z.boolean().default(true),
});

export type CreateEmailTemplateInput = z.infer<typeof createEmailTemplateSchema>;
export type SendBroadcastInput = z.infer<typeof sendBroadcastSchema>;
export type CreateAutomationInput = z.infer<typeof createAutomationSchema>;

import { z } from "zod";

export const createTicketTypeSchema = z.object({
  event_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  type: z.enum(["free", "paid"]).default("free"),
  price: z.number().min(0).default(0),
  quantity: z.number().int().min(1).optional(),
  sales_start: z.string().datetime().optional(),
  sales_end: z.string().datetime().optional(),
  sort_order: z.number().int().default(0),
});

export const registerSchema = z.object({
  event_id: z.string().uuid(),
  ticket_type_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  email: z.string().email(),
  custom_fields: z.record(z.string(), z.unknown()).optional(),
});

export const checkInSchema = z.object({
  qr_code: z.string().min(1),
});

export type CreateTicketTypeInput = z.infer<typeof createTicketTypeSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CheckInInput = z.infer<typeof checkInSchema>;

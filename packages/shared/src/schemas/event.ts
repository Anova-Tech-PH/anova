import { z } from "zod";

export const createEventSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with dashes"),
  description: z.string().max(5000).optional(),
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
  timezone: z.string().default("UTC"),
  venue_name: z.string().max(200).optional(),
  venue_address: z.string().max(500).optional(),
  is_virtual: z.boolean().default(false),
  virtual_url: z.string().url().optional(),
  cover_image: z.string().url().optional(),
  status: z.enum(["draft", "published", "cancelled", "completed"]).default("draft"),
});

export const updateEventSchema = createEventSchema.partial();

export const createTrackSchema = z.object({
  event_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  color: z.string().max(7).optional(),
  sort_order: z.number().int().default(0),
});

export const createSpeakerSchema = z.object({
  event_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  title: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  bio: z.string().max(2000).optional(),
  photo: z.string().url().optional(),
  email: z.string().email().optional(),
});

export const createSessionSchema = z.object({
  event_id: z.string().uuid(),
  track_id: z.string().uuid().optional(),
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional(),
  type: z.enum(["talk", "workshop", "panel", "keynote", "break"]).default("talk"),
  start_time: z.string().datetime(),
  end_time: z.string().datetime(),
  location: z.string().max(200).optional(),
  speaker_ids: z.array(z.string().uuid()).optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type CreateTrackInput = z.infer<typeof createTrackSchema>;
export type CreateSpeakerInput = z.infer<typeof createSpeakerSchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;

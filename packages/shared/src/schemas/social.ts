import { z } from "zod";

export const createPostSchema = z.object({
  event_id: z.string().uuid(),
  type: z.enum(["text", "photo", "poll", "announcement"]).default("text"),
  content: z.string().min(1).max(2000),
  image_url: z.string().url().optional(),
  poll_options: z.array(z.string().min(1).max(200)).min(2).max(10).optional(),
});

export const createCommentSchema = z.object({
  post_id: z.string().uuid(),
  content: z.string().min(1).max(500),
});

export const sendMessageSchema = z.object({
  conversation_id: z.string().uuid(),
  content: z.string().min(1).max(1000),
  image_url: z.string().url().optional(),
});

export const createConversationSchema = z.object({
  event_id: z.string().uuid(),
  is_group: z.boolean().default(false),
  name: z.string().max(200).optional(),
  member_ids: z.array(z.string().uuid()).min(1),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;

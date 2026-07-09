import { z } from "zod";

export const updateProfileSchema = z.object({
  full_name: z.string().min(1).max(200),
  avatar_url: z.string().url().optional(),
  bio: z.string().max(500).optional(),
  company: z.string().max(200).optional(),
  job_title: z.string().max(200).optional(),
  interests: z.array(z.string().max(50)).max(20).optional(),
  looking_for: z.array(z.string().max(100)).max(10).optional(),
  linkedin_url: z.string().url().optional(),
  twitter_handle: z.string().max(50).optional(),
});

export const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  full_name: z.string().min(1).max(200),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

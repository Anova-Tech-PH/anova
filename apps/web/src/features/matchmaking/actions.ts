"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function createInterest(
  eventId: string,
  data: { name: string }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("event_interests")
    .insert({
      event_id: eventId,
      name: data.name.trim(),
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/matchmaking`);
}

export async function updateInterest(
  eventId: string,
  interestId: string,
  data: { name?: string }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("event_interests")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", interestId)
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/matchmaking`);
}

export async function deleteInterest(eventId: string, interestId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("event_interests")
    .delete()
    .eq("id", interestId)
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/matchmaking`);
}

export async function generateInterests(eventId: string): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Fetch event details and sessions for context
  const { data: event } = await supabase
    .from("events")
    .select("title, description")
    .eq("id", eventId)
    .single();

  const { data: sessions } = await supabase
    .from("sessions")
    .select("title, description")
    .eq("event_id", eventId)
    .limit(50);

  if (!event) throw new Error("Event not found");

  const sessionList = (sessions ?? [])
    .map((s: { title: string; description: string | null }) => s.title)
    .join(", ");

  const prompt = `Given this event and its sessions, suggest up to 10 short interest tags (max 30 chars each) that attendees might share. Return ONLY a JSON array of strings, no explanation.

Event: ${event.title}
Description: ${event.description ?? ""}
Sessions: ${sessionList}

Example output: ["Artificial Intelligence", "Sustainability", "Leadership"]`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": (() => {
        const key = process.env.ANTHROPIC_API_KEY;
        if (!key) throw new Error("ANTHROPIC_API_KEY is not configured");
        return key;
      })(),
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) throw new Error("Failed to generate interests");

  const result = await response.json();
  const text = result.content?.[0]?.text ?? "[]";
  let suggestions: string[];
  try {
    suggestions = JSON.parse(text);
    if (!Array.isArray(suggestions)) throw new Error("not an array");
  } catch {
    throw new Error("Failed to parse AI-generated interests");
  }

  return suggestions
    .filter((s: string) => typeof s === "string" && s.length <= 30)
    .slice(0, 10);
}

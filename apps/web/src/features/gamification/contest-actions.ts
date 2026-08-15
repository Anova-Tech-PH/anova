"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

const CONTEST_ACTIVITY_MAP: Record<string, string> = {
  photo: "photo_upload",
  caption: "caption_submit",
  icebreaker: "icebreaker_answer",
};

// ── createContest ────────────────────────────────────────────────────

export async function createContest(
  eventId: string,
  data: {
    type: "photo" | "caption" | "icebreaker";
    title: string;
    description?: string;
    image_url?: string;
    starts_at?: string;
    ends_at?: string;
    points_per_action?: number;
    status?: "draft" | "active" | "ended";
  }
) {
  const supabase = await createClient();

  const { data: contest, error } = await supabase
    .from("contests")
    .insert({ event_id: eventId, ...data })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/gamification`);
  return contest;
}

// ── updateContest ────────────────────────────────────────────────────

export async function updateContest(
  eventId: string,
  contestId: string,
  data: {
    title?: string;
    description?: string;
    image_url?: string;
    starts_at?: string;
    ends_at?: string;
    points_per_action?: number;
    status?: "draft" | "active" | "ended";
  }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("contests")
    .update(data)
    .eq("id", contestId)
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/gamification`);
}

// ── deleteContest ────────────────────────────────────────────────────

export async function deleteContest(eventId: string, contestId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("contests")
    .delete()
    .eq("id", contestId)
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/gamification`);
}

// ── submitContestEntry ───────────────────────────────────────────────

export async function submitContestEntry(
  contestId: string,
  userId: string,
  data: {
    content?: string;
    image_url?: string;
  }
) {
  const supabase = await createClient();

  // 1. Look up the contest to get event_id, type, status, and points
  const { data: contest, error: contestError } = await supabase
    .from("contests")
    .select("id, event_id, type, status, points_per_action")
    .eq("id", contestId)
    .single();

  if (contestError) throw new Error(contestError.message);
  if (!contest) throw new Error("Contest not found");

  const c = contest as Record<string, unknown>;
  if (c.status !== "active") throw new Error("Contest is not active");

  // 2. Insert the entry
  const { data: entry, error: entryError } = await supabase
    .from("contest_entries")
    .insert({
      contest_id: contestId,
      user_id: userId,
      ...data,
    })
    .select()
    .single();

  if (entryError) throw new Error(entryError.message);

  const entryRecord = entry as Record<string, unknown>;

  // 3. Award points via RPC
  const activityType = CONTEST_ACTIVITY_MAP[c.type as string] ?? "photo_upload";
  const { error: rpcError } = await supabase.rpc("award_points", {
    _event_id: c.event_id as string,
    _user_id: userId,
    _activity_type: activityType,
    _points: c.points_per_action as number,
    _reference_id: entryRecord.id as string,
    _reference_type: "contest_entry",
  });

  if (rpcError) throw new Error(rpcError.message);

  revalidatePath(`/events/${c.event_id}/gamification`);
  return entry;
}

// ── toggleContestLike ────────────────────────────────────────────────

export async function toggleContestLike(
  entryId: string,
  userId: string
): Promise<{ liked: boolean }> {
  const supabase = await createClient();

  // Check if already liked
  const { data: existing, error: checkError } = await supabase
    .from("contest_likes")
    .select("id")
    .eq("entry_id", entryId)
    .eq("user_id", userId)
    .single();

  if (existing && !checkError) {
    // Already liked — remove the like
    await supabase
      .from("contest_likes")
      .delete()
      .eq("entry_id", entryId)
      .eq("user_id", userId);

    // Decrement likes_count
    await supabase
      .from("contest_entries")
      .update({ likes_count: -1 })
      .eq("id", entryId);

    return { liked: false };
  } else {
    // Not liked — insert like
    const { error: insertError } = await supabase
      .from("contest_likes")
      .insert({ entry_id: entryId, user_id: userId });

    if (insertError) throw new Error(insertError.message);

    // Increment likes_count
    await supabase
      .from("contest_entries")
      .update({ likes_count: 1 })
      .eq("id", entryId);

    return { liked: true };
  }
}

"use server";

import { createHmac } from "crypto";
import { createClient } from "@attendly/ui/supabase/server";

const CHECKIN_SECRET = process.env.CHECKIN_HMAC_SECRET ?? "attendly-checkin-secret-change-me";

/**
 * Generate an HMAC-SHA256 token for QR check-in verification.
 * Pure function (not async).
 */
export function generateCheckinToken(type: string, id: string, eventId: string): string {
  const payload = `${type}:${id}:${eventId}`;
  return createHmac("sha256", CHECKIN_SECRET).update(payload).digest("hex");
}

/**
 * Validate a check-in token against expected values.
 * Pure function (not async).
 */
export function validateCheckinToken(
  type: string,
  id: string,
  eventId: string,
  token: string
): boolean {
  const expected = generateCheckinToken(type, id, eventId);
  return token === expected;
}

type PerformCheckinParams = {
  type: "session" | "exhibitor";
  id: string;
  eventId: string;
  userId: string;
};

type PerformCheckinResult = {
  success: boolean;
  points: number;
  alreadyCheckedIn: boolean;
};

/**
 * Perform a check-in for a session or exhibitor booth.
 * Inserts record, awards points, handles duplicate gracefully.
 */
export async function performCheckin({
  type,
  id,
  eventId,
  userId,
}: PerformCheckinParams): Promise<PerformCheckinResult> {
  const supabase = await createClient();

  if (type === "session") {
    const { error } = await supabase.from("session_checkins").insert({
      session_id: id,
      event_id: eventId,
      user_id: userId,
    });

    if (error) {
      if (error.code === "23505") {
        return { success: true, points: 0, alreadyCheckedIn: true };
      }
      return { success: false, points: 0, alreadyCheckedIn: false };
    }

    const { data: pointsAwarded } = await supabase.rpc("award_points", {
      _event_id: eventId,
      _user_id: userId,
      _activity_type: "session_checkin",
      _reference_id: id,
      _reference_type: "session",
    });

    return { success: true, points: (pointsAwarded as number) ?? 0, alreadyCheckedIn: false };
  }

  // type === "exhibitor"
  const { error } = await supabase.from("exhibitor_passport_stamps").insert({
    exhibitor_id: id,
    event_id: eventId,
    user_id: userId,
  });

  if (error) {
    if (error.code === "23505") {
      return { success: true, points: 0, alreadyCheckedIn: true };
    }
    return { success: false, points: 0, alreadyCheckedIn: false };
  }

  const { data: pointsAwarded } = await supabase.rpc("award_points", {
    _event_id: eventId,
    _user_id: userId,
    _activity_type: "exhibitor_visit",
    _reference_id: id,
    _reference_type: "exhibitor",
  });

  return { success: true, points: (pointsAwarded as number) ?? 0, alreadyCheckedIn: false };
}

/**
 * Get the list of exhibitor IDs a user has stamped at an event.
 */
export async function getPassportStamps(eventId: string, userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("exhibitor_passport_stamps")
    .select("exhibitor_id")
    .eq("event_id", eventId)
    .eq("user_id", userId);

  return (data ?? []).map((row: { exhibitor_id: string }) => row.exhibitor_id);
}

/**
 * Get session check-in records, optionally filtered by session.
 */
export async function getSessionCheckins(eventId: string, sessionId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("session_checkins")
    .select("*")
    .eq("event_id", eventId);

  if (sessionId) {
    query = query.eq("session_id", sessionId);
  }

  const { data } = await query;
  return data ?? [];
}

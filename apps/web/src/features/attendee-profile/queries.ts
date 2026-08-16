"use server";

import { createClient } from "@attendly/ui/supabase/server";

export async function getAttendeeDirectory(
  eventId: string,
  options: {
    tab?: "all" | "recommended" | "bookmarked" | "categories";
    search?: string;
    category?: string;
    page?: number;
    pageSize?: number;
  } = {}
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { tab = "all", search, category, page = 1, pageSize = 24 } = options;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("attendee_profiles")
    .select("id, event_id, display_name, avatar_url, title, company, location, bio, is_visible_in_directory", { count: "exact" })
    .eq("event_id", eventId)
    .eq("is_visible_in_directory", true)
    .neq("id", user.id)
    .order("display_name")
    .range(from, to);

  if (search) {
    query = query.or(`display_name.ilike.%${search}%,company.ilike.%${search}%,title.ilike.%${search}%,location.ilike.%${search}%`);
  }

  if (tab === "bookmarked") {
    // Get bookmarked user IDs first
    const { data: bookmarks } = await supabase
      .from("attendee_bookmarks")
      .select("bookmarked_user_id")
      .eq("user_id", user.id)
      .eq("event_id", eventId);

    const bookmarkedIds = bookmarks?.map(b => b.bookmarked_user_id) ?? [];
    if (bookmarkedIds.length === 0) return { profiles: [], total: 0 };
    query = query.in("id", bookmarkedIds);
  }

  const { data, count, error } = await query;
  if (error) throw error;

  return { profiles: data ?? [], total: count ?? 0 };
}

export async function getAttendeeProfile(eventId: string, userId: string) {
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("attendee_profiles")
    .select("*")
    .eq("id", userId)
    .eq("event_id", eventId)
    .single();

  if (error) throw error;

  // Get interests
  const { data: interests } = await supabase
    .from("attendee_interests")
    .select("interest_id, event_interests(id, name)")
    .eq("user_id", userId);

  return { ...profile, interests: interests?.map(i => i.event_interests) ?? [] };
}

export async function getMyProfile(eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("attendee_profiles")
    .select("*")
    .eq("id", user.id)
    .eq("event_id", eventId)
    .single();

  return profile;
}

export async function getAttendeeCategoryMap(eventId: string) {
  const supabase = await createClient();

  const { data: registrations } = await supabase
    .from("registrations")
    .select("user_id, category_id, attendee_categories(name, color)")
    .eq("event_id", eventId)
    .not("category_id", "is", null);

  const map: Record<string, { name: string; color: string }> = {};
  for (const r of registrations ?? []) {
    const cat = r.attendee_categories as { name: string; color: string } | null;
    if (r.user_id && cat) {
      map[r.user_id] = { name: cat.name, color: cat.color };
    }
  }
  return map;
}

export async function getAttendeeNotes(eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};

  const { data } = await supabase
    .from("attendee_notes")
    .select("target_user_id, content")
    .eq("user_id", user.id);

  const map: Record<string, string> = {};
  for (const n of data ?? []) {
    map[n.target_user_id] = n.content;
  }
  return map;
}

export async function getBookmarkedAttendeeIds(eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("attendee_bookmarks")
    .select("bookmarked_user_id")
    .eq("user_id", user.id)
    .eq("event_id", eventId);

  return data?.map(b => b.bookmarked_user_id) ?? [];
}

export async function getAttendeeAffiliations(eventId: string, userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("attendee_affiliations")
    .select("*")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .order("sort_order");

  if (error) return [];
  return data ?? [];
}

export async function getAttendeeEducation(eventId: string, userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("attendee_education")
    .select("*")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .order("sort_order");

  if (error) return [];
  return data ?? [];
}

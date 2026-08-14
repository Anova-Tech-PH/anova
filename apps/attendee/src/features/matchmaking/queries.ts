import { createClient } from "@attendly/ui/supabase/server";

export type EventInterest = {
  id: string;
  name: string;
  selected: boolean;
};

export type MatchedAttendee = {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  company: string | null;
  job_title: string | null;
  shared_interests: string[];
  shared_count: number;
};

export async function getEventInterestsForAttendee(
  eventId: string,
  userId: string
): Promise<EventInterest[]> {
  const supabase = await createClient();

  const { data: interests } = await supabase
    .from("event_interests")
    .select("id, name")
    .eq("event_id", eventId)
    .order("sort_order");

  const { data: selected } = await supabase
    .from("attendee_interests")
    .select("interest_id")
    .eq("event_id", eventId)
    .eq("user_id", userId);

  const selectedIds = new Set(
    (selected ?? []).map((s: { interest_id: string }) => s.interest_id)
  );

  return (interests ?? []).map((i: { id: string; name: string }) => ({
    id: i.id,
    name: i.name,
    selected: selectedIds.has(i.id),
  }));
}

export async function getMatches(
  eventId: string,
  userId: string
): Promise<MatchedAttendee[]> {
  const supabase = await createClient();

  const { data: myInterests } = await supabase
    .from("attendee_interests")
    .select("interest_id")
    .eq("event_id", eventId)
    .eq("user_id", userId);

  if (!myInterests || myInterests.length === 0) return [];

  const myInterestIds = myInterests.map(
    (i: { interest_id: string }) => i.interest_id
  );

  const { data: matches } = await supabase
    .from("attendee_interests")
    .select("user_id, interest_id")
    .eq("event_id", eventId)
    .in("interest_id", myInterestIds)
    .neq("user_id", userId);

  if (!matches || matches.length === 0) return [];

  const userMap = new Map<string, string[]>();
  for (const m of matches as { user_id: string; interest_id: string }[]) {
    const list = userMap.get(m.user_id) ?? [];
    list.push(m.interest_id);
    userMap.set(m.user_id, list);
  }

  const { data: interestNames } = await supabase
    .from("event_interests")
    .select("id, name")
    .in("id", myInterestIds);

  const interestNameMap = new Map(
    (interestNames ?? []).map((i: { id: string; name: string }) => [
      i.id,
      i.name,
    ])
  );

  const userIds = [...userMap.keys()];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, bio, company, job_title")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles ?? []).map((p: Record<string, unknown>) => [p.id, p])
  );

  const result: MatchedAttendee[] = userIds
    .map((uid) => {
      const sharedIds = userMap.get(uid) ?? [];
      const profile = profileMap.get(uid) as
        | Record<string, unknown>
        | undefined;
      return {
        user_id: uid,
        full_name: (profile?.full_name as string) ?? "Unknown",
        avatar_url: (profile?.avatar_url as string) ?? null,
        bio: (profile?.bio as string) ?? null,
        company: (profile?.company as string) ?? null,
        job_title: (profile?.job_title as string) ?? null,
        shared_interests: sharedIds.map(
          (id) => interestNameMap.get(id) ?? id
        ),
        shared_count: sharedIds.length,
      };
    })
    .sort((a, b) => b.shared_count - a.shared_count)
    .slice(0, 50);

  return result;
}

import { createClient } from "@attendly/ui/supabase/server";

export type SocialGroup = {
  id: string;
  event_id: string;
  created_by: string | null;
  title: string;
  description: string | null;
  prompt: string | null;
  is_visible: boolean;
  sort_order: number;
  member_count: number;
  post_count: number;
  created_at: string;
  updated_at: string;
};

export type SocialGroupPost = {
  id: string;
  group_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author_name: string | null;
  author_email: string | null;
  comment_count: number;
};

export async function getSocialGroups(
  eventId: string
): Promise<{ groups: SocialGroup[]; total: number }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("social_groups")
    .select("*, social_group_members(count), social_group_posts(count)")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  const groups = (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    member_count: (row.social_group_members as { count: number }[])?.[0]?.count ?? 0,
    post_count: (row.social_group_posts as { count: number }[])?.[0]?.count ?? 0,
    social_group_members: undefined,
    social_group_posts: undefined,
  })) as SocialGroup[];

  return {
    groups,
    total: groups.length,
  };
}

export async function getSocialGroup(
  groupId: string
): Promise<SocialGroup | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("social_groups")
    .select("*, social_group_members(count), social_group_posts(count)")
    .eq("id", groupId)
    .single();

  if (error) return null;

  const row = data as Record<string, unknown>;
  return {
    ...row,
    member_count: (row.social_group_members as { count: number }[])?.[0]?.count ?? 0,
    post_count: (row.social_group_posts as { count: number }[])?.[0]?.count ?? 0,
    social_group_members: undefined,
    social_group_posts: undefined,
  } as SocialGroup;
}

export async function getGroupPosts(
  groupId: string
): Promise<SocialGroupPost[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("social_group_posts")
    .select("*, social_group_post_comments(count)")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  // Fetch author profiles
  const posts = data ?? [];
  if (posts.length === 0) return [];

  const userIds = [...new Set(posts.map((p: Record<string, unknown>) => p.user_id as string))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles ?? []).map((p: Record<string, unknown>) => [p.id, p])
  );

  return posts.map((post: Record<string, unknown>) => {
    const profile = profileMap.get(post.user_id as string) as Record<string, unknown> | undefined;
    return {
      ...post,
      author_name: (profile?.full_name as string) ?? null,
      author_email: (profile?.email as string) ?? null,
      comment_count: (post.social_group_post_comments as { count: number }[])?.[0]?.count ?? 0,
      social_group_post_comments: undefined,
    };
  }) as SocialGroupPost[];
}

export type GroupMember = {
  user_id: string;
  joined_at: string;
  profiles: { full_name: string | null; email: string } | null;
};

export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("social_group_members")
    .select("user_id, joined_at")
    .eq("group_id", groupId)
    .order("joined_at", { ascending: true });

  if (error) throw new Error(error.message);

  const members = data ?? [];
  if (members.length === 0) return [];

  const userIds = members.map((m: { user_id: string }) => m.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles ?? []).map((p: Record<string, unknown>) => [p.id, p])
  );

  return members.map((m: { user_id: string; joined_at: string }) => ({
    user_id: m.user_id,
    joined_at: m.joined_at,
    profiles: (profileMap.get(m.user_id) as { full_name: string | null; email: string }) ?? null,
  }));
}

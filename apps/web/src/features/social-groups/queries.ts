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

  const groups = (data ?? []).map((row) => ({
    id: row.id as string,
    event_id: row.event_id as string,
    created_by: row.created_by as string | null,
    title: row.title as string,
    description: row.description as string | null,
    prompt: row.prompt as string | null,
    is_visible: row.is_visible as boolean,
    sort_order: row.sort_order as number,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    member_count: (row.social_group_members as { count: number }[])?.[0]?.count ?? 0,
    post_count: (row.social_group_posts as { count: number }[])?.[0]?.count ?? 0,
  })) satisfies SocialGroup[];

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

  return {
    id: data.id as string,
    event_id: data.event_id as string,
    created_by: data.created_by as string | null,
    title: data.title as string,
    description: data.description as string | null,
    prompt: data.prompt as string | null,
    is_visible: data.is_visible as boolean,
    sort_order: data.sort_order as number,
    created_at: data.created_at as string,
    updated_at: data.updated_at as string,
    member_count: (data.social_group_members as { count: number }[])?.[0]?.count ?? 0,
    post_count: (data.social_group_posts as { count: number }[])?.[0]?.count ?? 0,
  } satisfies SocialGroup;
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

  const userIds = [...new Set(posts.map((p) => p.user_id as string))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p])
  );

  return posts.map((post) => {
    const profile = profileMap.get(post.user_id as string) as { full_name?: string; email?: string } | undefined;
    return {
      id: post.id as string,
      group_id: post.group_id as string,
      user_id: post.user_id as string,
      content: post.content as string,
      created_at: post.created_at as string,
      updated_at: post.updated_at as string,
      author_name: (profile?.full_name as string) ?? null,
      author_email: (profile?.email as string) ?? null,
      comment_count: (post.social_group_post_comments as { count: number }[])?.[0]?.count ?? 0,
    };
  }) satisfies SocialGroupPost[];
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
    (profiles ?? []).map((p) => [p.id, p])
  );

  return members.map((m: { user_id: string; joined_at: string }) => ({
    user_id: m.user_id,
    joined_at: m.joined_at,
    profiles: (profileMap.get(m.user_id) as { full_name: string | null; email: string }) ?? null,
  }));
}

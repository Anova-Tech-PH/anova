import { createClient } from "@attendly/ui/supabase/server";

export type SocialGroup = {
  id: string;
  event_id: string;
  created_by: string | null;
  title: string;
  description: string | null;
  is_visible: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export async function getSocialGroups(
  eventId: string
): Promise<{ groups: SocialGroup[]; total: number }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("social_groups")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  const groups = (data ?? []) as SocialGroup[];

  return {
    groups,
    total: groups.length,
  };
}

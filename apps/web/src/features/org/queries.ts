import { createClient } from "@attendly/ui/supabase/server";

export type OrgContext = {
  id: string;
  name: string;
  slug: string;
  role: string;
};

export async function getOrgBySlug(orgSlug: string, userId: string): Promise<OrgContext | null> {
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", orgSlug)
    .single();

  if (!org) return null;

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", org.id)
    .eq("user_id", userId)
    .single();

  if (!membership) return null;

  return { id: org.id, name: org.name, slug: org.slug, role: membership.role };
}

export async function getUserOrgs(userId: string): Promise<OrgContext[]> {
  const supabase = await createClient();

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("role, organizations(id, name, slug)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (!memberships) return [];

  return memberships.map((m) => {
    const org = m.organizations as any;
    return { id: org.id, name: org.name, slug: org.slug, role: m.role };
  });
}

export async function getFirstOrgSlug(userId: string): Promise<string | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("organization_members")
    .select("organizations(slug)")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (!data) return null;
  return (data.organizations as any)?.slug ?? null;
}

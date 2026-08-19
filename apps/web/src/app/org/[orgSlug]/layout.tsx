import { redirect } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/server";
import { getOrgBySlug } from "@/features/org/queries";
import { OrganizerShell } from "./organizer-shell";

export default async function OrgLayout({
  params,
  children,
}: {
  params: Promise<{ orgSlug: string }>;
  children: React.ReactNode;
}) {
  const { orgSlug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const org = await getOrgBySlug(orgSlug, user.id);

  if (!org) redirect("/onboarding");

  return <OrganizerShell orgSlug={orgSlug}>{children}</OrganizerShell>;
}

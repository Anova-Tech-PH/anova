import { createClient } from "@attendly/ui/supabase/server";
import { getTopics, getIcebreaker } from "@/features/community/queries";
import { CommunityBoard } from "@/features/community/components/community-board";

export default async function CommunityPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
  searchParams: Promise<{ tab?: string; search?: string }>;
}) {
  const { orgSlug, eventSlug } = await params;
  const query = await searchParams;
  const supabase = await createClient();

  // Resolve event
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .single();

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("slug", eventSlug)
    .eq("organization_id", org?.id ?? "")
    .single();

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-xl font-semibold">Event not found</h2>
      </div>
    );
  }

  // Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-xl font-semibold mb-2">
          Sign in to join the community
        </h2>
        <p className="text-muted-foreground">
          Connect with other attendees by signing in to your account.
        </p>
      </div>
    );
  }

  const tab =
    (query.tab as "all" | "following" | "by_organizers" | "new") || "all";

  const [topics, icebreaker] = await Promise.all([
    getTopics(event.id, { tab, search: query.search }),
    getIcebreaker(event.id),
  ]);

  return (
    <CommunityBoard
      eventId={event.id}
      topics={topics}
      totalCount={topics.length}
      currentTab={tab}
      currentSearch={query.search || ""}
      basePath={`/${orgSlug}/${eventSlug}/community`}
      icebreaker={icebreaker}
    />
  );
}

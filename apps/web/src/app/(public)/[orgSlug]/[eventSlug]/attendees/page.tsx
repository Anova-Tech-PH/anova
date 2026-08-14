import { createClient } from "@attendly/ui/supabase/server";
import {
  getAttendeeDirectory,
  getBookmarkedAttendeeIds,
} from "@/features/attendee-profile/queries";
import { AttendeeDirectory } from "@/features/attendee-profile/components/attendee-directory";

export default async function AttendeesPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
  searchParams: Promise<{ tab?: string; search?: string; page?: string }>;
}) {
  const { orgSlug, eventSlug } = await params;
  const query = await searchParams;
  const supabase = await createClient();

  // Get event ID
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
          Sign in to view attendees
        </h2>
        <p className="text-muted-foreground">
          Connect with other attendees by signing in to your account.
        </p>
      </div>
    );
  }

  const tab =
    (query.tab as "all" | "recommended" | "bookmarked" | "categories") || "all";
  const page = parseInt(query.page || "1", 10);

  const [directoryData, bookmarkedIds] = await Promise.all([
    getAttendeeDirectory(event.id, { tab, search: query.search, page }),
    getBookmarkedAttendeeIds(event.id),
  ]);

  return (
    <AttendeeDirectory
      eventId={event.id}
      profiles={directoryData.profiles}
      total={directoryData.total}
      bookmarkedIds={bookmarkedIds}
      currentTab={tab}
      currentSearch={query.search || ""}
      currentPage={page}
      basePath={`/${orgSlug}/${eventSlug}/attendees`}
    />
  );
}

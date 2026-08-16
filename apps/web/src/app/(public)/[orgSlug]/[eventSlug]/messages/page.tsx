import { createClient } from "@attendly/ui/supabase/server";
import {
  getConversations,
  getConversationMessages,
} from "@/features/messaging/queries";
import { getAttendeeDirectory } from "@/features/attendee-profile/queries";
import { AuthGuard } from "../auth-guard";
import { MessagesView } from "./messages-view";

export default async function MessagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
  searchParams: Promise<{ userId?: string }>;
}) {
  const { orgSlug, eventSlug } = await params;
  const query = await searchParams;
  const basePath = `/${orgSlug}/${eventSlug}`;
  const currentPath = `${basePath}/messages`;

  return (
    <AuthGuard currentPath={currentPath}>
      <MessagesContent
        orgSlug={orgSlug}
        eventSlug={eventSlug}
        selectedUserId={query.userId}
      />
    </AuthGuard>
  );
}

async function MessagesContent({
  orgSlug,
  eventSlug,
  selectedUserId,
}: {
  orgSlug: string;
  eventSlug: string;
  selectedUserId?: string;
}) {
  const supabase = await createClient();
  const basePath = `/${orgSlug}/${eventSlug}`;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

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

  const [conversations, { profiles: attendees }] = await Promise.all([
    getConversations(event.id),
    getAttendeeDirectory(event.id, { pageSize: 200 }),
  ]);

  let initialMessages: Awaited<ReturnType<typeof getConversationMessages>> | undefined;
  let selectedUserName: string | undefined;
  let selectedUserAvatarUrl: string | null | undefined;

  if (selectedUserId) {
    const [messages, profileResult] = await Promise.all([
      getConversationMessages(event.id, selectedUserId),
      supabase
        .from("attendee_profiles")
        .select("id, display_name, avatar_url, title, company")
        .eq("id", selectedUserId)
        .eq("event_id", event.id)
        .single(),
    ]);
    initialMessages = messages;
    selectedUserName = profileResult.data?.display_name ?? "Unknown";
    selectedUserAvatarUrl = profileResult.data?.avatar_url ?? null;
  }

  return (
    <MessagesView
      eventId={event.id}
      currentUserId={user.id}
      basePath={basePath}
      conversations={conversations}
      attendees={attendees.map((a) => ({
        id: a.id,
        display_name: a.display_name,
        avatar_url: a.avatar_url,
        title: a.title,
        company: a.company,
      }))}
      selectedUserId={selectedUserId}
      selectedUserName={selectedUserName}
      selectedUserAvatarUrl={selectedUserAvatarUrl}
      initialMessages={initialMessages}
    />
  );
}

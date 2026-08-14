import { createClient } from "@attendly/ui/supabase/server";
import {
  getConversations,
  getConversationMessages,
} from "@/features/messaging/queries";
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

  if (selectedUserId) {
    const messages = await getConversationMessages(event.id, selectedUserId);
    const { data: otherProfile } = await supabase
      .from("attendee_profiles")
      .select("id, display_name, avatar_url, title, company")
      .eq("id", selectedUserId)
      .eq("event_id", event.id)
      .single();

    return (
      <div className="mx-auto max-w-2xl">
        <MessagesView
          mode="thread"
          eventId={event.id}
          currentUserId={user.id}
          basePath={basePath}
          otherUserId={selectedUserId}
          otherUserName={otherProfile?.display_name ?? "Unknown"}
          otherUserAvatarUrl={otherProfile?.avatar_url ?? null}
          initialMessages={messages}
        />
      </div>
    );
  }

  const conversations = await getConversations(event.id);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-semibold mb-6">Messages</h1>
      <MessagesView
        mode="inbox"
        eventId={event.id}
        currentUserId={user.id}
        basePath={basePath}
        conversations={conversations}
      />
    </div>
  );
}

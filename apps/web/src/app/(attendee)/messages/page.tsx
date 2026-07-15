import { redirect } from "next/navigation";
import { createClient } from "@/shared/utils/supabase/server";
import { getConversations, getMessages } from "@/features/messaging/queries";
import { MessagesView } from "./messages-view";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string }>;
}) {
  const { conversation: conversationId } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const conversations = await getConversations();
  const selectedConvId = conversationId ?? conversations[0]?.id ?? null;

  let messages: any[] = [];
  let selectedConv: any = null;

  if (selectedConvId) {
    messages = await getMessages(selectedConvId);
    selectedConv = conversations.find((c) => c.id === selectedConvId) ?? null;
  }

  return (
    <MessagesView
      conversations={conversations}
      selectedConversationId={selectedConvId}
      selectedConversationName={selectedConv?.display_name ?? ""}
      selectedConversationAvatar={selectedConv?.display_avatar ?? null}
      initialMessages={messages}
      currentUserId={user.id}
    />
  );
}

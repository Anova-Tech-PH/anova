"use client";

import { useRouter } from "next/navigation";
import { MessageInbox } from "@/features/messaging/components/message-inbox";
import { ConversationThread } from "@/features/messaging/components/conversation-thread";
import { getConversations } from "@/features/messaging/queries";

type Conversation = Awaited<ReturnType<typeof getConversations>>[number];

type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
};

type InboxProps = {
  mode: "inbox";
  eventId: string;
  currentUserId: string;
  basePath: string;
  conversations: Conversation[];
};

type ThreadProps = {
  mode: "thread";
  eventId: string;
  currentUserId: string;
  basePath: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatarUrl: string | null;
  initialMessages: Message[];
};

type MessagesViewProps = InboxProps | ThreadProps;

export function MessagesView(props: MessagesViewProps) {
  const router = useRouter();

  if (props.mode === "thread") {
    return (
      <ConversationThread
        eventId={props.eventId}
        currentUserId={props.currentUserId}
        otherUserId={props.otherUserId}
        otherUserName={props.otherUserName}
        otherUserAvatarUrl={props.otherUserAvatarUrl}
        initialMessages={props.initialMessages}
        onBack={() => router.push(`${props.basePath}/messages`)}
      />
    );
  }

  return (
    <MessageInbox
      eventId={props.eventId}
      conversations={props.conversations}
      onSelectConversation={(otherUserId) =>
        router.push(`${props.basePath}/messages?userId=${otherUserId}`)
      }
      attendeesHref={`${props.basePath}/attendees`}
    />
  );
}

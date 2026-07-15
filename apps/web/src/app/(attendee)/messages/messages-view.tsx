"use client";

import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { ConversationList } from "@/features/messaging/components/conversation-list";
import { ChatWindow } from "@/features/messaging/components/chat-window";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { cn } from "@/shared/utils/cn";

export function MessagesView({
  conversations,
  selectedConversationId,
  selectedConversationName,
  selectedConversationAvatar,
  initialMessages,
  currentUserId,
}: {
  conversations: any[];
  selectedConversationId: string | null;
  selectedConversationName: string;
  selectedConversationAvatar: string | null;
  initialMessages: any[];
  currentUserId: string;
}) {
  const router = useRouter();

  function handleSelect(id: string) {
    router.push(`/messages?conversation=${id}`);
  }

  function handleBack() {
    router.push("/messages");
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-xl border bg-background shadow-sm lg:h-[calc(100vh-5rem)]">
      {/* Conversation list panel */}
      <div
        className={cn(
          "flex w-full shrink-0 flex-col border-r sm:w-80 lg:w-96",
          selectedConversationId ? "hidden sm:flex" : "flex"
        )}
      >
        {/* List header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-base font-semibold">Messages</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {conversations.length}
          </span>
        </div>

        {/* Scrollable conversation list */}
        <div className="flex-1 overflow-y-auto">
          <ConversationList
            conversations={conversations}
            selectedId={selectedConversationId}
            onSelect={handleSelect}
          />
        </div>
      </div>

      {/* Chat area */}
      <div
        className={cn(
          "flex-1",
          !selectedConversationId ? "hidden sm:flex" : "flex"
        )}
      >
        {selectedConversationId ? (
          <div className="flex w-full flex-col">
            <ChatWindow
              conversationId={selectedConversationId}
              conversationName={selectedConversationName}
              conversationAvatar={selectedConversationAvatar}
              initialMessages={initialMessages}
              currentUserId={currentUserId}
              onBack={handleBack}
            />
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center bg-muted/10">
            <EmptyState
              icon={<MessageCircle className="h-10 w-10" />}
              title="Select a conversation"
              description="Choose a conversation from the list to start messaging"
              className="border-none bg-transparent"
            />
          </div>
        )}
      </div>
    </div>
  );
}

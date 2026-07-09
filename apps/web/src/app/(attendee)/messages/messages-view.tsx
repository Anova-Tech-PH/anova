"use client";

import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { ConversationList } from "@/features/messaging/components/conversation-list";
import { ChatWindow } from "@/features/messaging/components/chat-window";

export function MessagesView({
  conversations,
  selectedConversationId,
  selectedConversationName,
  initialMessages,
  currentUserId,
}: {
  conversations: any[];
  selectedConversationId: string | null;
  selectedConversationName: string;
  initialMessages: any[];
  currentUserId: string;
}) {
  const router = useRouter();

  function handleSelect(id: string) {
    router.push(`/messages?conversation=${id}`);
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] overflow-hidden rounded-xl border lg:h-[calc(100vh-5rem)]">
      {/* Conversation list */}
      <div className={`w-full shrink-0 border-r sm:w-72 ${selectedConversationId ? "hidden sm:block" : ""}`}>
        <div className="border-b px-4 py-3">
          <h2 className="font-semibold">Messages</h2>
        </div>
        <div className="overflow-y-auto">
          <ConversationList
            conversations={conversations}
            selectedId={selectedConversationId}
            onSelect={handleSelect}
          />
        </div>
      </div>

      {/* Chat area */}
      <div className={`flex-1 ${!selectedConversationId ? "hidden sm:flex" : "flex"}`}>
        {selectedConversationId ? (
          <div className="flex w-full flex-col">
            <ChatWindow
              conversationId={selectedConversationId}
              conversationName={selectedConversationName}
              initialMessages={initialMessages}
              currentUserId={currentUserId}
            />
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
            <MessageCircle className="h-8 w-8" />
            <p className="text-sm">Select a conversation</p>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { Avatar, Button } from "@attendly/ui/components";
import { createClient } from "@attendly/ui/supabase/client";
import { sendMessage, markMessagesRead } from "@/features/messaging/actions";
import { toast } from "sonner";

type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
};

interface ConversationThreadProps {
  eventId: string;
  currentUserId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatarUrl: string | null;
  initialMessages: Message[];
  onBack: () => void;
}

export function ConversationThread({
  eventId,
  currentUserId,
  otherUserId,
  otherUserName,
  otherUserAvatarUrl,
  initialMessages,
  onBack,
}: ConversationThreadProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Mark messages as read on mount
  useEffect(() => {
    markMessagesRead(eventId, otherUserId).catch(() => {});
  }, [eventId, otherUserId]);

  // Subscribe to new messages via Supabase Realtime
  const handleInsert = useCallback(
    (payload: { new: Record<string, unknown> }) => {
      const newMsg = payload.new as unknown as Message;
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      // Mark as read if we are the recipient
      if (newMsg.recipient_id === currentUserId) {
        markMessagesRead(eventId, otherUserId).catch(() => {});
      }
    },
    [currentUserId, eventId, otherUserId]
  );

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`dm-${eventId}-${[currentUserId, otherUserId].sort().join("-")}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          const msg = payload.new as unknown as Message;
          // Only handle messages in this conversation
          const isRelevant =
            (msg.sender_id === currentUserId &&
              msg.recipient_id === otherUserId) ||
            (msg.sender_id === otherUserId &&
              msg.recipient_id === currentUserId);
          if (isRelevant) {
            handleInsert(payload);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, currentUserId, otherUserId, handleInsert]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || sending) return;

    const trimmed = input.trim();
    setInput("");
    setSending(true);

    // Optimistic add
    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      sender_id: currentUserId,
      recipient_id: otherUserId,
      content: trimmed,
      read_at: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      await sendMessage(eventId, otherUserId, trimmed);
    } catch (err) {
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      toast.error(
        err instanceof Error ? err.message : "Failed to send message"
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <button
          onClick={onBack}
          className="rounded-md p-1.5 transition-colors hover:bg-accent"
          aria-label="Back to inbox"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Avatar
          src={otherUserAvatarUrl}
          name={otherUserName}
          size="sm"
        />
        <h3 className="text-sm font-semibold text-foreground">
          {otherUserName}
        </h3>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              No messages yet. Send the first one!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isSent = msg.sender_id === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex items-end gap-2 ${isSent ? "flex-row-reverse" : ""}`}
              >
                {!isSent && (
                  <Avatar
                    src={otherUserAvatarUrl}
                    name={otherUserName}
                    size="sm"
                  />
                )}
                <div
                  className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                    isSent
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p>{msg.content}</p>
                  <p
                    className={`mt-1 text-[10px] ${
                      isSent
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    }`}
                  >
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reply input */}
      <div className="border-t p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

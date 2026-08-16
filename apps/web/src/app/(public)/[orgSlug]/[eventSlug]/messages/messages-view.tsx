"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  PenSquare,
  Send,
  ArrowLeft,
  MessageSquare,
  Search,
} from "lucide-react";
import { Avatar, Badge, Button } from "@attendly/ui/components";
import { NewMessageDialog } from "@/features/messaging/components/new-message-dialog";
import {
  sendMessage,
  markMessagesRead,
} from "@/features/messaging/actions";
import { createClient } from "@attendly/ui/supabase/client";
import { toast } from "sonner";

type Conversation = {
  otherUserId: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  profile: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    title: string | null;
    company: string | null;
  } | null;
};

type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
};

type Attendee = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  title: string | null;
  company: string | null;
};

interface MessagesViewProps {
  eventId: string;
  currentUserId: string;
  basePath: string;
  conversations: Conversation[];
  attendees: Attendee[];
  selectedUserId?: string;
  selectedUserName?: string;
  selectedUserAvatarUrl?: string | null;
  initialMessages?: Message[];
}

/* ------------------------------------------------------------------ */
/*  Timestamp formatting                                               */
/* ------------------------------------------------------------------ */

function formatTimestamp(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

/* ------------------------------------------------------------------ */
/*  Chat Thread (right panel)                                          */
/* ------------------------------------------------------------------ */

function ChatThread({
  eventId,
  currentUserId,
  otherUserId,
  otherUserName,
  otherUserAvatarUrl,
  initialMessages,
  onBack,
}: {
  eventId: string;
  currentUserId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatarUrl: string | null;
  initialMessages: Message[];
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    markMessagesRead(eventId, otherUserId).catch(() => {});
  }, [eventId, otherUserId]);

  const handleInsert = useCallback(
    (payload: { new: Record<string, unknown> }) => {
      const newMsg = payload.new as unknown as Message;
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      if (newMsg.recipient_id === currentUserId) {
        markMessagesRead(eventId, otherUserId).catch(() => {});
      }
    },
    [currentUserId, eventId, otherUserId]
  );

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(
        `dm-${eventId}-${[currentUserId, otherUserId].sort().join("-")}`
      )
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
          const isRelevant =
            (msg.sender_id === currentUserId &&
              msg.recipient_id === otherUserId) ||
            (msg.sender_id === otherUserId &&
              msg.recipient_id === currentUserId);
          if (isRelevant) handleInsert(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, currentUserId, otherUserId, handleInsert]);

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
          className="rounded-md p-1.5 transition-colors hover:bg-accent lg:hidden"
          aria-label="Back to inbox"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <Avatar src={otherUserAvatarUrl} name={otherUserName} size="sm" />
        <h3 className="text-sm font-semibold">{otherUserName}</h3>
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
                  className={`max-w-[70%] rounded-2xl px-3.5 py-2 text-sm ${
                    isSent
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p
                    className={`mt-1 text-[10px] ${
                      isSent
                        ? "text-primary-foreground/60"
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

      {/* Input */}
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
            className="flex-1 rounded-full border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main split-panel view                                              */
/* ------------------------------------------------------------------ */

export function MessagesView({
  eventId,
  currentUserId,
  basePath,
  conversations,
  attendees,
  selectedUserId,
  selectedUserName,
  selectedUserAvatarUrl,
  initialMessages,
}: MessagesViewProps) {
  const router = useRouter();
  const [showCompose, setShowCompose] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeUserId, setActiveUserId] = useState<string | null>(
    selectedUserId ?? null
  );

  // Derive active user info from conversations or attendees
  const activeConv = conversations.find(
    (c) => c.otherUserId === activeUserId
  );
  const activeName =
    activeUserId === selectedUserId
      ? selectedUserName ?? activeConv?.profile?.display_name ?? "Unknown"
      : activeConv?.profile?.display_name ?? "Unknown";
  const activeAvatar =
    activeUserId === selectedUserId
      ? selectedUserAvatarUrl ?? activeConv?.profile?.avatar_url ?? null
      : activeConv?.profile?.avatar_url ?? null;

  function handleSelectConversation(otherUserId: string) {
    setActiveUserId(otherUserId);
    router.push(`${basePath}/messages?userId=${otherUserId}`, {
      scroll: false,
    });
  }

  function handleBack() {
    setActiveUserId(null);
    router.push(`${basePath}/messages`, { scroll: false });
  }

  const filtered = searchQuery.trim()
    ? conversations.filter((conv) =>
        (conv.profile?.display_name ?? "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      )
    : conversations;

  return (
    <div className="flex h-[calc(100dvh-8rem)] overflow-hidden rounded-xl border bg-card">
      {/* Left panel — conversation list */}
      <div
        className={`w-full lg:w-80 shrink-0 flex flex-col border-r ${
          activeUserId ? "hidden lg:flex" : "flex"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h1 className="text-lg font-semibold">Messages</h1>
          <button
            onClick={() => setShowCompose(true)}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent transition-colors"
            aria-label="New message"
          >
            <PenSquare className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative px-3 py-2">
          <Search className="absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full rounded-full border bg-muted/50 pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50 focus:bg-background"
          />
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length > 0 ? (
            filtered.map((conv) => {
              const name = conv.profile?.display_name ?? "Unknown";
              const subtitle = [conv.profile?.title, conv.profile?.company]
                .filter(Boolean)
                .join(" @ ");
              const isSelected = conv.otherUserId === activeUserId;

              return (
                <button
                  key={conv.otherUserId}
                  onClick={() => handleSelectConversation(conv.otherUserId)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                    isSelected
                      ? "bg-primary/10"
                      : "hover:bg-accent/50"
                  }`}
                >
                  <Avatar
                    src={conv.profile?.avatar_url ?? null}
                    name={name}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h4
                        className={`truncate text-sm ${
                          conv.unreadCount > 0
                            ? "font-bold text-foreground"
                            : "font-medium text-foreground"
                        }`}
                      >
                        {name}
                      </h4>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatTimestamp(conv.lastMessageAt)}
                      </span>
                    </div>
                    {subtitle && (
                      <p className="truncate text-xs text-muted-foreground">
                        {subtitle}
                      </p>
                    )}
                    <p
                      className={`mt-0.5 truncate text-xs ${
                        conv.unreadCount > 0
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground/80"
                      }`}
                    >
                      {conv.lastMessage}
                    </p>
                  </div>
                  {conv.unreadCount > 0 && (
                    <span className="mt-1 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                      {conv.unreadCount}
                    </span>
                  )}
                </button>
              );
            })
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <MessageSquare className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 text-sm font-medium text-muted-foreground">
                No messages yet
              </p>
              <p className="mt-1 text-xs text-muted-foreground/70">
                Start a conversation with attendees.
              </p>
              <Button
                onClick={() => setShowCompose(true)}
                size="sm"
                className="mt-4 gap-2"
              >
                <PenSquare className="h-3.5 w-3.5" />
                New message
              </Button>
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No conversations match your search.
            </div>
          )}
        </div>
      </div>

      {/* Right panel — chat thread or empty state */}
      <div
        className={`flex-1 flex flex-col ${
          activeUserId ? "flex" : "hidden lg:flex"
        }`}
      >
        {activeUserId ? (
          <ChatThread
            eventId={eventId}
            currentUserId={currentUserId}
            otherUserId={activeUserId}
            otherUserName={activeName}
            otherUserAvatarUrl={activeAvatar}
            initialMessages={initialMessages ?? []}
            onBack={handleBack}
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center text-center px-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Your Messages</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Select a conversation or start a new one.
            </p>
            <Button
              onClick={() => setShowCompose(true)}
              size="sm"
              className="mt-4 gap-2"
            >
              <PenSquare className="h-3.5 w-3.5" />
              New message
            </Button>
          </div>
        )}
      </div>

      {/* New message dialog */}
      <NewMessageDialog
        eventId={eventId}
        attendees={attendees}
        open={showCompose}
        onClose={() => setShowCompose(false)}
      />
    </div>
  );
}

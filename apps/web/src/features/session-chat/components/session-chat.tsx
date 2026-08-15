"use client";

import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@attendly/ui/components";
import { sendChatMessage } from "@/features/session-chat/actions";

type ChatMessage = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  author: {
    display_name: string;
    avatar_url: string | null;
  };
};

function formatChatTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  }) + " " + date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SessionChat({
  sessionId,
  initialMessages,
  currentUserId,
  currentUserName,
  currentUserAvatar,
}: {
  sessionId: string;
  initialMessages: ChatMessage[];
  currentUserId: string | null;
  currentUserName?: string;
  currentUserAvatar?: string | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;

    if (!currentUserId) {
      toast.error("Sign in to chat");
      return;
    }

    const content = input.trim();
    setSending(true);

    // Optimistic add
    const optimisticMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      user_id: currentUserId,
      content,
      created_at: new Date().toISOString(),
      author: {
        display_name: currentUserName ?? "You",
        avatar_url: currentUserAvatar ?? null,
      },
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setInput("");

    try {
      const result = await sendChatMessage(sessionId, content);
      // Replace optimistic with real message
      setMessages((prev) =>
        prev.map((m) =>
          m.id === optimisticMsg.id
            ? { ...optimisticMsg, id: result.id, created_at: result.created_at }
            : m
        )
      );
    } catch {
      // Remove optimistic message on error
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      toast.error("Failed to send message");
      setInput(content);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages list */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No messages yet — start the conversation!
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="flex gap-2.5">
              <Avatar
                src={msg.author.avatar_url}
                name={msg.author.display_name}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold">
                    {msg.author.display_name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatChatTime(msg.created_at)}
                  </span>
                </div>
                <p className="mt-0.5 text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {msg.content}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {currentUserId ? (
        <form
          onSubmit={handleSend}
          className="border-t p-3 flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Write a reply..."
            maxLength={2000}
            className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      ) : (
        <div className="border-t p-3 text-center text-xs text-muted-foreground">
          Sign in to join the conversation
        </div>
      )}
    </div>
  );
}

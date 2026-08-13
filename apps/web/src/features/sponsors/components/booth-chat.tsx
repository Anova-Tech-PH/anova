"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@attendly/ui/supabase/client";
import { sendBoothMessage } from "@/features/sponsors/actions";
import { Send, MessageSquare, LogIn } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type BoothMessage = {
  id: string;
  sponsor_id: string;
  event_id: string;
  user_id: string;
  message: string;
  created_at: string;
};

type BoothChatProps = {
  sponsorId: string;
  eventId: string;
};

export function BoothChat({ sponsorId, eventId }: BoothChatProps) {
  const [messages, setMessages] = useState<BoothMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Get current user and load existing messages
  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setLoading(false);
    });

    // Load existing messages
    supabase
      .from("booth_messages")
      .select("*")
      .eq("sponsor_id", sponsorId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data as BoothMessage[]);
      });
  }, [sponsorId]);

  // Subscribe to new messages via Realtime
  const handleInsert = useCallback(
    (payload: { new: Record<string, unknown> }) => {
      const newMsg = payload.new as unknown as BoothMessage;
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    },
    []
  );

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`booth-chat-${sponsorId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "booth_messages",
          filter: `sponsor_id=eq.${sponsorId}`,
        },
        handleInsert
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sponsorId, handleInsert]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || sending || !userId) return;

    const trimmed = input.trim();
    setInput("");
    setSending(true);

    // Optimistic add
    const optimistic: BoothMessage = {
      id: `temp-${Date.now()}`,
      sponsor_id: sponsorId,
      event_id: eventId,
      user_id: userId,
      message: trimmed,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      await sendBoothMessage(sponsorId, eventId, trimmed);
    } catch {
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">Loading chat...</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center">
        <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <p className="mt-3 text-sm text-muted-foreground">
          Sign in to join the booth chat.
        </p>
        <Link
          href={`/login?redirect=${encodeURIComponent(pathname)}`}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <LogIn className="h-4 w-4" />
          Sign in to chat
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card">
      {/* Messages */}
      <div ref={scrollRef} className="h-80 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.user_id === userId;
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  {msg.user_id.charAt(0).toUpperCase()}
                </div>
                <div
                  className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${
                    isOwn
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p>{msg.message}</p>
                  <p
                    className={`mt-1 text-[10px] ${
                      isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
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

"use client";

import { useState, useRef, useEffect } from "react";
import { Send, User } from "lucide-react";
import { toast } from "sonner";
import { sendMessage, markConversationRead } from "../actions";

type Message = {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  sender_id: string;
  profiles: { full_name: string; avatar_url: string | null } | null;
};

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ChatWindow({
  conversationId,
  conversationName,
  initialMessages,
  currentUserId,
}: {
  conversationId: string;
  conversationName: string;
  initialMessages: Message[];
  currentUserId: string;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    markConversationRead(conversationId);
  }, [conversationId]);

  async function handleSend() {
    if (!input.trim()) return;
    setLoading(true);

    try {
      const message = await sendMessage({
        conversation_id: conversationId,
        content: input.trim(),
      });
      setMessages((prev) => [...prev, message]);
      setInput("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send");
    } finally {
      setLoading(false);
    }
  }

  // Group messages by date
  let lastDate = "";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b px-4 py-3">
        <h3 className="font-medium">{conversationName}</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No messages yet. Say hello!
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.sender_id === currentUserId;
            const msgDate = new Date(msg.created_at).toLocaleDateString();
            const showDate = msgDate !== lastDate;
            lastDate = msgDate;

            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="my-4 flex items-center gap-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-[10px] text-muted-foreground">{msgDate}</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                )}
                <div className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                  <div className={`flex max-w-[75%] gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
                    {!isOwn && (
                      msg.profiles?.avatar_url ? (
                        <img src={msg.profiles.avatar_url} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
                          <User className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )
                    )}
                    <div>
                      {!isOwn && (
                        <p className="mb-0.5 text-[10px] text-muted-foreground">
                          {msg.profiles?.full_name ?? "Unknown"}
                        </p>
                      )}
                      <div
                        className={`rounded-2xl px-3 py-2 text-sm ${
                          isOwn
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        {msg.content}
                      </div>
                      {msg.image_url && (
                        <img src={msg.image_url} alt="" className="mt-1 max-h-48 rounded-lg" />
                      )}
                      <p className={`mt-0.5 text-[10px] text-muted-foreground ${isOwn ? "text-right" : ""}`}>
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Type a message..."
            className="flex-1 rounded-full border bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

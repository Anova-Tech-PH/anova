"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Send, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Avatar } from "@/shared/components/ui";
import { cn } from "@/shared/utils/cn";
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

function formatDateLabel(date: string) {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const oneDay = 86400000;

  if (diff < oneDay && now.getDate() === d.getDate()) return "Today";
  if (diff < oneDay * 2 && now.getDate() - d.getDate() === 1) return "Yesterday";

  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function ChatWindow({
  conversationId,
  conversationName,
  conversationAvatar,
  initialMessages,
  currentUserId,
  onBack,
}: {
  conversationId: string;
  conversationName: string;
  conversationAvatar?: string | null;
  initialMessages: Message[];
  currentUserId: string;
  onBack?: () => void;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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

  // Pre-compute message groups for rendering
  const messageGroups = useMemo(() => {
    const groups: {
      msg: Message;
      isOwn: boolean;
      showDate: boolean;
      dateLabel: string;
      isFirstInGroup: boolean;
      isLastInGroup: boolean;
    }[] = [];

    let lastDate = "";

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const isOwn = msg.sender_id === currentUserId;
      const msgDate = new Date(msg.created_at).toLocaleDateString();
      const showDate = msgDate !== lastDate;
      lastDate = msgDate;

      const prevMsg = messages[i - 1];
      const nextMsg = messages[i + 1];
      const prevSameSender = prevMsg?.sender_id === msg.sender_id && !showDate;
      const nextSameSender =
        nextMsg?.sender_id === msg.sender_id &&
        new Date(nextMsg.created_at).toLocaleDateString() === msgDate;

      groups.push({
        msg,
        isOwn,
        showDate,
        dateLabel: formatDateLabel(msg.created_at),
        isFirstInGroup: !prevSameSender,
        isLastInGroup: !nextSameSender,
      });
    }

    return groups;
  }, [messages, currentUserId]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b bg-background/80 px-4 py-3 backdrop-blur-sm">
        {onBack && (
          <button
            onClick={onBack}
            className="mr-1 rounded-lg p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="relative">
          <Avatar
            src={conversationAvatar}
            name={conversationName}
            size="sm"
          />
          <span className="absolute bottom-0 right-0 block h-2 w-2 rounded-full border-[1.5px] border-background bg-emerald-500" />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{conversationName}</h3>
          <p className="text-[11px] text-emerald-600">Online</p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto scroll-smooth bg-muted/20 px-4 py-3"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
            <Avatar
              src={conversationAvatar}
              name={conversationName}
              size="lg"
            />
            <p className="mt-2 text-sm font-medium text-foreground">
              {conversationName}
            </p>
            <p className="text-xs">No messages yet. Say hello!</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {messageGroups.map(
              ({ msg, isOwn, showDate, dateLabel, isFirstInGroup, isLastInGroup }) => (
                <div key={msg.id}>
                  {/* Date separator */}
                  {showDate && (
                    <div className="my-4 flex items-center gap-3">
                      <div className="h-px flex-1 bg-border" />
                      <span className="rounded-full bg-muted px-3 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {dateLabel}
                      </span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  )}

                  {/* Message row */}
                  <div
                    className={cn(
                      "flex",
                      isOwn ? "justify-end" : "justify-start",
                      isFirstInGroup && !showDate ? "mt-3" : "",
                      isFirstInGroup && showDate ? "mt-1" : ""
                    )}
                  >
                    <div
                      className={cn(
                        "flex max-w-[75%] gap-2",
                        isOwn ? "flex-row-reverse" : ""
                      )}
                    >
                      {/* Avatar — only on first message in group for non-own messages */}
                      {!isOwn && (
                        <div className="w-7 shrink-0">
                          {isFirstInGroup && (
                            <Avatar
                              src={msg.profiles?.avatar_url}
                              name={msg.profiles?.full_name}
                              size="sm"
                              className="h-7 w-7"
                            />
                          )}
                        </div>
                      )}

                      <div className="min-w-0">
                        {/* Sender name — only on first in group */}
                        {!isOwn && isFirstInGroup && (
                          <p className="mb-0.5 ml-1 text-[11px] font-medium text-muted-foreground">
                            {msg.profiles?.full_name ?? "Unknown"}
                          </p>
                        )}

                        {/* Bubble */}
                        <div
                          className={cn(
                            "px-3 py-2 text-sm leading-relaxed",
                            isOwn
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground",
                            // Bubble rounding logic for grouped messages
                            isOwn
                              ? cn(
                                  isFirstInGroup && isLastInGroup && "rounded-2xl",
                                  isFirstInGroup && !isLastInGroup && "rounded-2xl rounded-br-md",
                                  !isFirstInGroup && isLastInGroup && "rounded-2xl rounded-tr-md",
                                  !isFirstInGroup && !isLastInGroup && "rounded-l-2xl rounded-r-md"
                                )
                              : cn(
                                  isFirstInGroup && isLastInGroup && "rounded-2xl",
                                  isFirstInGroup && !isLastInGroup && "rounded-2xl rounded-bl-md",
                                  !isFirstInGroup && isLastInGroup && "rounded-2xl rounded-tl-md",
                                  !isFirstInGroup && !isLastInGroup && "rounded-r-2xl rounded-l-md"
                                )
                          )}
                        >
                          {msg.content}
                        </div>

                        {/* Image attachment */}
                        {msg.image_url && (
                          <img
                            src={msg.image_url}
                            alt=""
                            className="mt-1 max-h-48 rounded-lg"
                          />
                        )}

                        {/* Timestamp — only on last message in group */}
                        {isLastInGroup && (
                          <p
                            className={cn(
                              "mt-0.5 text-[10px] text-muted-foreground",
                              isOwn ? "mr-1 text-right" : "ml-1"
                            )}
                          >
                            {formatTime(msg.created_at)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t bg-background px-3 py-3">
        <div className="flex items-center gap-2">
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && !e.shiftKey && handleSend()
            }
            placeholder="Type a message..."
            className="flex-1 rounded-full border-muted-foreground/20 bg-muted/50 px-4 py-2 text-sm shadow-sm transition-shadow focus:shadow-md"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim()}
            loading={loading}
            className="h-9 w-9 shrink-0 rounded-full p-0 shadow-sm transition-transform hover:scale-105 active:scale-95"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare, Search } from "lucide-react";
import { Avatar, Badge } from "@attendly/ui/components";
import { getConversations } from "@/features/messaging/queries";

type Conversation = Awaited<ReturnType<typeof getConversations>>[number];

interface MessageInboxProps {
  eventId: string;
  conversations: Conversation[];
  onSelectConversation: (otherUserId: string) => void;
  attendeesHref?: string;
}

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

export function MessageInbox({
  eventId,
  conversations: initialConversations,
  onSelectConversation,
  attendeesHref,
}: MessageInboxProps) {
  const [conversations, setConversations] =
    useState<Conversation[]>(initialConversations);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setConversations(initialConversations);
  }, [initialConversations]);

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <MessageSquare className="h-10 w-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm font-medium text-muted-foreground">
          No messages yet
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          {attendeesHref ? (
            <Link href={attendeesHref} className="text-primary hover:underline">
              Visit attendee profiles
            </Link>
          ) : (
            "Visit attendee profiles"
          )}{" "}
          and say hi to start a conversation.
        </p>
      </div>
    );
  }

  const filtered = searchQuery.trim()
    ? conversations.filter((conv) =>
        (conv.profile?.display_name ?? "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      )
    : conversations;

  return (
    <div>
      <div className="relative px-4 py-3">
        <Search className="absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search conversations..."
          className="w-full rounded-lg border bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>
      {filtered.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          No conversations match your search.
        </div>
      ) : (
      <div className="divide-y divide-border">
      {filtered.map((conv) => {
        const name = conv.profile?.display_name ?? "Unknown";
        const subtitle = [conv.profile?.title, conv.profile?.company]
          .filter(Boolean)
          .join(" @ ");

        return (
          <button
            key={conv.otherUserId}
            onClick={() => onSelectConversation(conv.otherUserId)}
            className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50"
          >
            <Avatar
              src={conv.profile?.avatar_url ?? null}
              name={name}
              size="md"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="truncate text-sm font-semibold text-foreground">
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
              <p className="mt-0.5 truncate text-xs text-muted-foreground/80">
                {conv.lastMessage}
              </p>
            </div>
            {conv.unreadCount > 0 && (
              <Badge className="shrink-0 mt-1">{conv.unreadCount}</Badge>
            )}
          </button>
        );
      })}
      </div>
      )}
    </div>
  );
}

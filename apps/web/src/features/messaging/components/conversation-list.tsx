"use client";

import { Users } from "lucide-react";
import { Avatar } from "@/shared/components/ui";
import { cn } from "@/shared/utils/cn";

type Conversation = {
  id: string;
  is_group: boolean;
  display_name: string;
  display_avatar: string | null;
  last_message: { content: string; created_at: string } | null;
  unread_count: number;
};

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
}: {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (conversations.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground">
        No conversations yet
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {conversations.map((conv) => {
        const isSelected = selectedId === conv.id;
        const hasUnread = conv.unread_count > 0;

        return (
          <button
            key={conv.id}
            onClick={() => onSelect(conv.id)}
            className={cn(
              "relative flex items-center gap-3 px-4 py-3 text-left transition-all duration-150",
              "border-l-2 border-b border-b-border",
              "hover:bg-accent/60",
              isSelected
                ? "border-l-primary bg-accent shadow-[inset_0_0_0_0.5px_hsl(var(--border))]"
                : "border-l-transparent",
              hasUnread && !isSelected && "bg-accent/30"
            )}
          >
            {/* Avatar with online indicator */}
            <div className="relative shrink-0">
              {conv.is_group && !conv.display_avatar ? (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
              ) : (
                <Avatar
                  src={conv.display_avatar}
                  name={conv.display_name}
                  size="md"
                />
              )}
              {/* Static online indicator dot */}
              <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p
                  className={cn(
                    "truncate text-sm",
                    hasUnread ? "font-semibold" : "font-medium"
                  )}
                >
                  {conv.display_name}
                </p>
                {conv.last_message && (
                  <span className="shrink-0 text-[10px] text-muted-foreground">
                    {timeAgo(conv.last_message.created_at)}
                  </span>
                )}
              </div>
              {conv.last_message && (
                <p
                  className={cn(
                    "truncate text-xs",
                    hasUnread
                      ? "font-medium text-foreground/70"
                      : "text-muted-foreground"
                  )}
                >
                  {conv.last_message.content}
                </p>
              )}
            </div>

            {/* Unread badge */}
            {hasUnread && (
              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                {conv.unread_count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

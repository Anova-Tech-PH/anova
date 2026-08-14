"use client";

import { Megaphone, Camera, MessageSquare, MapPin } from "lucide-react";
import { Avatar } from "@attendly/ui/components";
import type { ActivityFeedItem } from "../queries";

const typeConfig: Record<
  ActivityFeedItem["type"],
  { icon: typeof Megaphone; label: string; color: string }
> = {
  announcement: {
    icon: Megaphone,
    label: "posted an announcement",
    color: "text-primary",
  },
  photo: {
    icon: Camera,
    label: "shared a photo",
    color: "text-info",
  },
  community_post: {
    icon: MessageSquare,
    label: "created a topic",
    color: "text-success",
  },
  meetup: {
    icon: MapPin,
    label: "posted a meetup",
    color: "text-warning",
  },
};

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  if (diffDay < 30) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function FeedItem({ item }: { item: ActivityFeedItem }) {
  const config = typeConfig[item.type] ?? typeConfig.community_post;
  const Icon = config.icon;
  const profile = item.attendee_profiles;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start gap-3">
        <Avatar
          name={profile.display_name}
          src={profile.avatar_url ?? undefined}
          size="sm"
          className="mt-0.5 h-8 w-8 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">
              {profile.display_name}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(item.created_at)}
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icon className={`h-3.5 w-3.5 ${config.color}`} />
            <span>{config.label}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

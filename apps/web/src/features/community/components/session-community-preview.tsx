"use client";

import Link from "next/link";
import {
  MessageSquare,
  Megaphone,
  MapPin,
  HelpCircle,
  Pin,
  MessageCircle,
  ChevronRight,
} from "lucide-react";

const typeIcons = {
  discussion: MessageSquare,
  announcement: Megaphone,
  meetup: MapPin,
  ask_organizer: HelpCircle,
} as const;

export interface CommunityTopicPreview {
  id: string;
  title: string;
  type: "discussion" | "announcement" | "meetup" | "ask_organizer";
  description: string | null;
  post_count: number;
  pinned: boolean;
}

export function SessionCommunityPreview({
  topics,
  communityUrl,
  totalCount,
}: {
  topics: CommunityTopicPreview[];
  communityUrl: string;
  totalCount: number;
}) {
  if (topics.length === 0) {
    return (
      <div className="p-4 py-8 text-center">
        <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/40" />
        <p className="mt-2 text-sm text-muted-foreground">
          No community topics yet.
        </p>
        <Link
          href={communityUrl}
          className="mt-3 inline-block text-sm text-primary hover:underline"
        >
          Go to Community
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{totalCount} topics</p>
        <Link
          href={communityUrl}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          View all
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {topics.map((topic) => {
        const Icon = typeIcons[topic.type];
        return (
          <Link
            key={topic.id}
            href={`${communityUrl}/${topic.id}`}
            className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
          >
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                {topic.pinned && (
                  <Pin className="h-3 w-3 shrink-0 text-amber-500" />
                )}
                <h4 className="text-sm font-medium leading-snug line-clamp-1">
                  {topic.title}
                </h4>
              </div>
              {topic.description && (
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                  {topic.description}
                </p>
              )}
              <span className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                <MessageCircle className="h-3 w-3" />
                {topic.post_count}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

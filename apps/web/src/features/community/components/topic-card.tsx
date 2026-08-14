"use client";

import { MessageSquare, Megaphone, MapPin, HelpCircle, Pin, Users, MessageCircle, Calendar, MapPinned } from "lucide-react";
import { Button } from "@attendly/ui/components";
import { toggleFollow } from "@/features/community/actions";
import { toast } from "sonner";
import { useTransition } from "react";
import Link from "next/link";

const typeIcons = {
  discussion: MessageSquare,
  announcement: Megaphone,
  meetup: MapPin,
  ask_organizer: HelpCircle,
} as const;

const typeLabels = {
  discussion: "Discussion",
  announcement: "Announcement",
  meetup: "Meetup",
  ask_organizer: "Ask Organizer",
} as const;

export interface TopicCardData {
  id: string;
  event_id: string;
  author_id: string;
  title: string;
  type: "discussion" | "announcement" | "meetup" | "ask_organizer";
  description: string | null;
  pinned: boolean;
  meetup_date: string | null;
  meetup_location: string | null;
  created_at: string;
  updated_at: string;
  post_count: number;
  follower_count: number;
  is_following: boolean;
}

export function TopicCard({
  topic,
  basePath,
}: {
  topic: TopicCardData;
  basePath: string;
}) {
  const [isPending, startTransition] = useTransition();
  const Icon = typeIcons[topic.type];

  function handleToggleFollow(e: React.MouseEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await toggleFollow(topic.id);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to toggle follow"
        );
      }
    });
  }

  return (
    <Link
      href={`${basePath}/${topic.id}`}
      className={`block rounded-xl border p-4 transition-shadow hover:shadow-md ${
        topic.pinned ? "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20" : "bg-card"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {topic.pinned && (
              <Pin className="h-3.5 w-3.5 shrink-0 text-amber-500" />
            )}
            <h3 className="font-medium leading-snug line-clamp-1">
              {topic.title}
            </h3>
          </div>
          {topic.description && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {topic.description}
            </p>
          )}

          {topic.type === "meetup" && (topic.meetup_date || topic.meetup_location) && (
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {topic.meetup_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(topic.meetup_date).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              )}
              {topic.meetup_location && (
                <span className="flex items-center gap-1">
                  <MapPinned className="h-3 w-3" />
                  {topic.meetup_location}
                </span>
              )}
            </div>
          )}

          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="text-[11px]">
              {new Date(topic.created_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              {topic.post_count}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {topic.follower_count}
            </span>
            <span className="ml-auto">
              <Button
                variant={topic.is_following ? "primary" : "outline"}
                size="sm"
                className="h-7 text-xs px-3"
                disabled={isPending}
                onClick={handleToggleFollow}
              >
                {topic.is_following ? "Following" : "Follow"}
              </Button>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

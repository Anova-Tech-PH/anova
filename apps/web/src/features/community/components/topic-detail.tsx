"use client";

import { useState, useTransition, useEffect } from "react";
import {
  ArrowLeft,
  MessageSquare,
  Megaphone,
  MapPin,
  HelpCircle,
  Calendar,
  MapPinned,
  Send,
} from "lucide-react";
import { Button, Badge, Textarea, Avatar } from "@attendly/ui/components";
import { createPost, toggleFollow, toggleReaction, markTopicRead } from "@/features/community/actions";
import { toast } from "sonner";
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

const EMOJIS = ["👍", "❤", "🤣"] as const;

interface Post {
  id: string;
  author_id: string;
  content: string;
  created_at: string;
  attendee_profiles: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  reactions: Record<string, number>;
  user_reactions: string[];
}

interface TopicDetailProps {
  topic: {
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
    author: {
      display_name: string | null;
      avatar_url: string | null;
    } | null;
    posts: Post[];
    is_following: boolean;
  };
  backPath: string;
}

function PostReactions({
  postId,
  reactions,
  userReactions,
}: {
  postId: string;
  reactions: Record<string, number>;
  userReactions: string[];
}) {
  const [localReactions, setLocalReactions] = useState(reactions);
  const [localUserReactions, setLocalUserReactions] = useState(new Set(userReactions));
  const [isPending, startTransition] = useTransition();

  function handleToggle(emoji: string) {
    const hasReacted = localUserReactions.has(emoji);
    setLocalReactions((prev) => ({
      ...prev,
      [emoji]: (prev[emoji] ?? 0) + (hasReacted ? -1 : 1),
    }));
    setLocalUserReactions((prev) => {
      const next = new Set(prev);
      if (hasReacted) next.delete(emoji);
      else next.add(emoji);
      return next;
    });

    startTransition(async () => {
      try {
        await toggleReaction(postId, emoji);
      } catch {
        // revert on error
        setLocalReactions(reactions);
        setLocalUserReactions(new Set(userReactions));
      }
    });
  }

  return (
    <div className="mt-2 flex gap-1">
      {EMOJIS.map((emoji) => {
        const count = localReactions[emoji] ?? 0;
        const active = localUserReactions.has(emoji);
        return (
          <button
            key={emoji}
            onClick={() => handleToggle(emoji)}
            disabled={isPending}
            aria-label={`${emoji}${count > 0 ? ` ${count}` : ""}`}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors ${
              active
                ? "bg-blue-100 text-blue-700 border border-blue-300"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
          >
            {emoji}
            {count > 0 && <span>{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function TopicDetail({ topic, backPath }: TopicDetailProps) {
  const [replyContent, setReplyContent] = useState("");
  const [isFollowPending, startFollowTransition] = useTransition();
  const [isPostPending, startPostTransition] = useTransition();
  const Icon = typeIcons[topic.type];

  useEffect(() => {
    markTopicRead(topic.id).catch(() => {});
  }, [topic.id]);

  function handleToggleFollow() {
    startFollowTransition(async () => {
      try {
        await toggleFollow(topic.id);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to toggle follow"
        );
      }
    });
  }

  function handleSubmitReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyContent.trim()) return;

    startPostTransition(async () => {
      try {
        await createPost(topic.id, replyContent.trim());
        setReplyContent("");
        toast.success("Reply posted!");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to post reply"
        );
      }
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      {/* Back link */}
      <Link
        href={backPath}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to community
      </Link>

      {/* Topic header */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="default" className="gap-1 text-xs">
                <Icon className="h-3 w-3" />
                {typeLabels[topic.type]}
              </Badge>
            </div>
            <h1 className="text-xl font-semibold">{topic.title}</h1>
          </div>
          <Button
            variant={topic.is_following ? "primary" : "outline"}
            size="sm"
            onClick={handleToggleFollow}
            disabled={isFollowPending}
          >
            {topic.is_following ? "Following" : "Follow"}
          </Button>
        </div>

        {/* Author + date */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Avatar
            src={topic.author?.avatar_url}
            name={topic.author?.display_name}
            size="sm"
          />
          <span>{topic.author?.display_name ?? "Unknown"}</span>
          <span>-</span>
          <span>
            {new Date(topic.created_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>

        {/* Description */}
        {topic.description && (
          <p className="text-sm leading-relaxed">{topic.description}</p>
        )}

        {/* Meetup details */}
        {topic.type === "meetup" &&
          (topic.meetup_date || topic.meetup_location) && (
            <div className="flex flex-wrap items-center gap-4 rounded-lg bg-muted/50 px-4 py-3 text-sm">
              {topic.meetup_date && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {new Date(topic.meetup_date).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              )}
              {topic.meetup_location && (
                <span className="flex items-center gap-1.5">
                  <MapPinned className="h-4 w-4 text-muted-foreground" />
                  {topic.meetup_location}
                </span>
              )}
            </div>
          )}
      </div>

      {/* Posts */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          {topic.posts.length} {topic.posts.length === 1 ? "reply" : "replies"}
        </h2>

        {topic.posts.length > 0 ? (
          topic.posts.map((post) => {
            const profile = Array.isArray(post.attendee_profiles)
              ? post.attendee_profiles[0]
              : post.attendee_profiles;
            return (
              <div
                key={post.id}
                className="rounded-xl border bg-card p-4 flex gap-3"
              >
                <Avatar
                  src={profile?.avatar_url}
                  name={profile?.display_name}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">
                      {profile?.display_name ?? "Unknown"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(post.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap">
                    {post.content}
                  </p>
                  <PostReactions
                    postId={post.id}
                    reactions={post.reactions ?? {}}
                    userReactions={post.user_reactions ?? []}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No replies yet. Be the first to respond!
          </div>
        )}
      </div>

      {/* Reply form */}
      <form
        onSubmit={handleSubmitReply}
        className="rounded-xl border bg-card p-4 space-y-3"
      >
        <Textarea
          value={replyContent}
          onChange={(e) => setReplyContent(e.target.value)}
          placeholder="Write a reply..."
          rows={3}
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isPostPending || !replyContent.trim()}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            {isPostPending ? "Sending..." : "Send"}
          </Button>
        </div>
      </form>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { Heart, MessageCircle, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { togglePostLike, createComment, deletePost, votePoll } from "../actions";
import { PostComposer } from "./post-composer";
import { Avatar } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { Input } from "@/shared/components/ui/input";

type Post = {
  id: string;
  type: string;
  content: string;
  image_url: string | null;
  poll_options: { index: number; text: string }[] | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  author_id: string;
  profiles: { full_name: string; avatar_url: string | null } | null;
  comments: {
    id: string;
    content: string;
    created_at: string;
    profiles: { full_name: string; avatar_url: string | null } | null;
  }[];
  liked: boolean;
  poll_vote_counts: Record<number, number>;
  user_poll_vote: number | null;
};

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function ActivityFeed({
  eventId,
  initialPosts,
  currentUserId,
}: {
  eventId: string;
  initialPosts: Post[];
  currentUserId: string;
}) {
  const [posts, setPosts] = useState(initialPosts);

  return (
    <div className="space-y-4">
      <PostComposer
        eventId={eventId}
        onPostCreated={(post) => setPosts((prev) => [post, ...prev])}
      />

      {posts.length === 0 ? (
        <EmptyState title="No posts yet. Be the first to share something!" />
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentUserId={currentUserId}
            onUpdate={(updated) =>
              setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
            }
            onDelete={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
          />
        ))
      )}
    </div>
  );
}

function PostCard({
  post,
  currentUserId,
  onUpdate,
  onDelete,
}: {
  post: Post;
  currentUserId: string;
  onUpdate: (post: Post) => void;
  onDelete: (id: string) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleLike() {
    startTransition(async () => {
      try {
        const { liked } = await togglePostLike(post.id);
        onUpdate({
          ...post,
          liked,
          likes_count: post.likes_count + (liked ? 1 : -1),
        });
      } catch {
        toast.error("Failed to like post");
      }
    });
  }

  function handleComment() {
    if (!commentText.trim()) return;
    startTransition(async () => {
      try {
        const comment = await createComment(post.id, commentText.trim());
        onUpdate({
          ...post,
          comments_count: post.comments_count + 1,
          comments: [...post.comments, comment],
        });
        setCommentText("");
      } catch {
        toast.error("Failed to add comment");
      }
    });
  }

  function handleDelete() {
    if (!confirm("Delete this post?")) return;
    startTransition(async () => {
      try {
        await deletePost(post.id);
        onDelete(post.id);
        toast.success("Post deleted");
      } catch {
        toast.error("Failed to delete post");
      }
    });
  }

  function handleVote(optionIndex: number) {
    if (post.user_poll_vote !== null) return;
    startTransition(async () => {
      try {
        await votePoll(post.id, optionIndex);
        const newCounts = { ...post.poll_vote_counts };
        newCounts[optionIndex] = (newCounts[optionIndex] ?? 0) + 1;
        onUpdate({
          ...post,
          poll_vote_counts: newCounts,
          user_poll_vote: optionIndex,
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to vote");
      }
    });
  }

  const totalVotes = Object.values(post.poll_vote_counts).reduce((a, b) => a + b, 0);

  return (
    <Card className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Avatar src={post.profiles?.avatar_url} name={post.profiles?.full_name} size="md" />
          <div>
            <p className="text-sm font-medium">{post.profiles?.full_name ?? "Unknown"}</p>
            <p className="text-[10px] text-muted-foreground">{timeAgo(post.created_at)}</p>
          </div>
        </div>
        {post.author_id === currentUserId && (
          <Button variant="ghost" size="icon" onClick={handleDelete} disabled={isPending} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Content */}
      <p className="mt-3 text-sm whitespace-pre-wrap">{post.content}</p>

      {post.image_url && (
        <img src={post.image_url} alt="" className="mt-3 max-h-80 w-full rounded-lg object-cover" />
      )}

      {/* Poll */}
      {post.type === "poll" && post.poll_options && (
        <div className="mt-3 space-y-2">
          {post.poll_options.map((option) => {
            const votes = post.poll_vote_counts[option.index] ?? 0;
            const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
            const voted = post.user_poll_vote === option.index;

            return (
              <button
                key={option.index}
                onClick={() => handleVote(option.index)}
                disabled={post.user_poll_vote !== null || isPending}
                className={`relative w-full overflow-hidden rounded-lg border p-2.5 text-left text-sm transition-colors ${
                  voted ? "border-primary bg-primary/5" : "hover:bg-accent"
                } ${post.user_poll_vote !== null ? "cursor-default" : ""}`}
              >
                {post.user_poll_vote !== null && (
                  <div
                    className="absolute inset-y-0 left-0 bg-primary/10"
                    style={{ width: `${pct}%` }}
                  />
                )}
                <span className="relative flex items-center justify-between">
                  <span>{option.text}</span>
                  {post.user_poll_vote !== null && (
                    <span className="text-xs text-muted-foreground">{pct}%</span>
                  )}
                </span>
              </button>
            );
          })}
          {totalVotes > 0 && (
            <p className="text-xs text-muted-foreground">{totalVotes} vote{totalVotes !== 1 ? "s" : ""}</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-3 flex items-center gap-4 border-t pt-3">
        <button
          onClick={handleLike}
          disabled={isPending}
          className={`flex items-center gap-1.5 text-sm ${post.liked ? "text-red-500" : "text-muted-foreground hover:text-foreground"}`}
        >
          <Heart className={`h-4 w-4 ${post.liked ? "fill-current" : ""}`} />
          {post.likes_count > 0 && post.likes_count}
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <MessageCircle className="h-4 w-4" />
          {post.comments_count > 0 && post.comments_count}
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="mt-3 space-y-3 border-t pt-3">
          {post.comments.map((comment) => (
            <div key={comment.id} className="flex gap-2">
              <Avatar src={comment.profiles?.avatar_url} name={comment.profiles?.full_name} size="sm" />
              <div>
                <p className="text-xs">
                  <span className="font-medium">{comment.profiles?.full_name ?? "Unknown"}</span>{" "}
                  <span className="text-muted-foreground">· {timeAgo(comment.created_at)}</span>
                </p>
                <p className="text-sm">{comment.content}</p>
              </div>
            </div>
          ))}

          <div className="flex gap-2">
            <Input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleComment()}
              placeholder="Write a comment..."
              className="flex-1"
            />
            <Button
              onClick={handleComment}
              disabled={!commentText.trim() || isPending}
              size="sm"
            >
              Reply
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

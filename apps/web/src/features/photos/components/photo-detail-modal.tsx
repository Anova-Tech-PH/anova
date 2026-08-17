"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Heart,
  ChevronLeft,
  ChevronRight,
  Download,
  Share2,
  X,
  Send,
} from "lucide-react";
import { Button, Input } from "@attendly/ui/components";
import { ModalOverlay } from "@attendly/ui/components";
import { togglePhotoLike } from "@/features/photos/actions";
import { addComment } from "@/features/photos/comment-actions";
import { getPhotoComments } from "@/features/photos/queries";
import { toast } from "sonner";

interface Photo {
  id: string;
  image_url: string;
  media_type: string;
  caption: string | null;
  likes_count: number;
  is_liked: boolean;
  author: {
    display_name: string;
    avatar_url: string | null;
  };
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  author_name?: string;
}

interface PhotoDetailModalProps {
  photos: Photo[];
  initialIndex: number;
  open: boolean;
  onClose: () => void;
  onLikeToggle?: (photoId: string) => void;
  onIndexChange?: (index: number) => void;
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export function PhotoDetailModal({
  photos,
  initialIndex,
  open,
  onClose,
  onLikeToggle,
  onIndexChange,
}: PhotoDetailModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isLiking, setIsLiking] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  const photo = photos[currentIndex];

  // Reset index when initialIndex changes (new photo clicked)
  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  // Notify parent when current index changes (for URL sync)
  useEffect(() => {
    if (open) {
      onIndexChange?.(currentIndex);
    }
  }, [currentIndex, open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch comments when photo changes
  const fetchComments = useCallback(async () => {
    if (!photo) return;
    setIsLoadingComments(true);
    try {
      const data = await getPhotoComments(photo.id);
      setComments(data);
    } catch {
      // keep empty
    } finally {
      setIsLoadingComments(false);
    }
  }, [photo?.id]);

  useEffect(() => {
    if (open && photo) {
      fetchComments();
    }
  }, [open, photo?.id, fetchComments]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        setCurrentIndex((i) => (i === 0 ? photos.length - 1 : i - 1));
      } else if (e.key === "ArrowRight") {
        setCurrentIndex((i) => (i === photos.length - 1 ? 0 : i + 1));
      } else if (e.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, photos.length, onClose]);

  async function handleLike() {
    if (isLiking || !photo) return;
    setIsLiking(true);

    // Optimistic - the parent manages the actual photo state
    onLikeToggle?.(photo.id);

    try {
      await togglePhotoLike(photo.id);
    } catch {
      // Revert by toggling again
      onLikeToggle?.(photo.id);
      toast.error("Failed to update like");
    } finally {
      setIsLiking(false);
    }
  }

  async function handleComment() {
    if (!commentText.trim() || isCommenting || !photo) return;
    setIsCommenting(true);

    const optimisticComment: Comment = {
      id: `temp-${Date.now()}`,
      content: commentText.trim(),
      created_at: new Date().toISOString(),
      user_id: "",
      author_name: "You",
    };

    setComments((prev) => [...prev, optimisticComment]);
    const savedText = commentText;
    setCommentText("");

    try {
      await addComment(photo.id, savedText.trim());
      // Refetch to get the real comment with proper id
      await fetchComments();
    } catch {
      // Revert
      setComments((prev) => prev.filter((c) => c.id !== optimisticComment.id));
      setCommentText(savedText);
      toast.error("Failed to post comment");
    } finally {
      setIsCommenting(false);
    }
  }

  async function handleShare() {
    const shareUrl = window.location.href;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Check out this photo!",
          url: shareUrl,
        });
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          toast.error("Sharing failed");
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard");
      } catch {
        toast.error("Could not copy link");
      }
    }
  }

  function goToPrev() {
    setCurrentIndex((i) => (i === 0 ? photos.length - 1 : i - 1));
  }

  function goToNext() {
    setCurrentIndex((i) => (i === photos.length - 1 ? 0 : i + 1));
  }

  if (!open || !photo) return null;

  const authorInitial =
    photo.author?.display_name?.charAt(0)?.toUpperCase() ?? "?";

  return (
    <ModalOverlay onClose={onClose}>
      <div
        className="relative w-full max-w-5xl max-h-[90vh] rounded-xl bg-card shadow-xl overflow-hidden flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Left side: Photo/Video display */}
        <div className="relative flex-1 flex items-center justify-center bg-black min-h-[300px] md:min-h-[500px]">
          {photo.media_type === "video" ? (
            <video
              key={photo.id}
              src={photo.image_url}
              controls
              className="max-h-[90vh] max-w-full object-contain"
            />
          ) : (
            <div className="relative w-full h-full min-h-[300px] md:min-h-[500px]">
              <Image
                key={photo.id}
                src={photo.image_url}
                alt={photo.caption || "Event photo"}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 60vw"
                priority
              />
            </div>
          )}

          {/* Navigation arrows */}
          {photos.length > 1 && (
            <>
              <button
                onClick={goToPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        {/* Right panel */}
        <div className="w-full md:w-80 border-t md:border-t-0 md:border-l flex flex-col max-h-[50vh] md:max-h-[90vh]">
          {/* Author section */}
          <div className="px-4 py-3 flex items-center gap-3">
            {photo.author?.avatar_url ? (
              <Image
                src={photo.author.avatar_url}
                alt={photo.author.display_name ?? ""}
                width={36}
                height={36}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                {authorInitial}
              </div>
            )}
            <span className="font-medium text-sm truncate">
              {photo.author?.display_name ?? "Unknown"}
            </span>
          </div>

          {/* Caption */}
          {photo.caption && (
            <div className="px-4 pb-3">
              <p className="text-sm text-muted-foreground">{photo.caption}</p>
            </div>
          )}

          <div className="border-t" />

          {/* Actions row */}
          <div className="px-4 py-2.5 flex items-center gap-3">
            <button
              onClick={handleLike}
              disabled={isLiking}
              className="flex items-center gap-1.5 text-sm hover:scale-105 transition-transform disabled:opacity-50"
            >
              <Heart
                className={`h-5 w-5 ${
                  photo.is_liked
                    ? "fill-red-500 text-red-500"
                    : "text-muted-foreground"
                }`}
              />
              <span className="text-muted-foreground">
                {photo.likes_count}
              </span>
            </button>
            <div className="flex-1" />
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <a
              href={photo.image_url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Download className="h-4 w-4" />
            </a>
          </div>

          <div className="border-t" />

          {/* Comments section */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
            {isLoadingComments ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No comments yet, be the first one!
              </p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold truncate">
                        {comment.author_name ?? "Attendee"}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatRelativeTime(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground break-words">
                      {comment.content}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Comment input */}
          <div className="border-t px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Input
                  value={commentText}
                  onChange={(e) =>
                    setCommentText(e.target.value.slice(0, 140))
                  }
                  placeholder="Write a comment..."
                  className="pr-12 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleComment();
                    }
                  }}
                  disabled={isCommenting}
                />
              </div>
              <Button
                size="sm"
                onClick={handleComment}
                disabled={!commentText.trim() || isCommenting}
                className="shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-right mt-1">
              <span className="text-xs text-muted-foreground">
                {commentText.length}/140
              </span>
            </div>
          </div>
        </div>
      </div>
    </ModalOverlay>
  );
}

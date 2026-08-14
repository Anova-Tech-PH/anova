"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Heart } from "lucide-react";
import { togglePhotoLike } from "@/features/photos/actions";
import { toast } from "sonner";

interface PhotoCardProps {
  photo: {
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
  };
}

export function PhotoCard({ photo }: PhotoCardProps) {
  const [isLiked, setIsLiked] = useState(photo.is_liked);
  const [likesCount, setLikesCount] = useState(photo.likes_count);
  const [isPending, startTransition] = useTransition();

  function handleLike() {
    // Optimistic update
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikesCount((c) => (wasLiked ? c - 1 : c + 1));

    startTransition(async () => {
      try {
        await togglePhotoLike(photo.id);
      } catch {
        // Revert on error
        setIsLiked(wasLiked);
        setLikesCount((c) => (wasLiked ? c + 1 : c - 1));
        toast.error("Failed to update like");
      }
    });
  }

  return (
    <div className="rounded-xl overflow-hidden border bg-card">
      <div className="relative aspect-square">
        {photo.media_type === "video" ? (
          <video
            src={photo.image_url}
            className="h-full w-full object-cover"
            muted
            playsInline
          />
        ) : (
          <Image
            src={photo.image_url}
            alt={photo.caption || "Event photo"}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        )}

        {/* Bottom overlay */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 pb-2.5 pt-8">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white truncate">
              By {photo.author?.display_name ?? "Unknown"}
            </span>
            <button
              onClick={handleLike}
              disabled={isPending}
              className="flex items-center gap-1 text-xs text-white hover:scale-110 transition-transform disabled:opacity-50"
            >
              <Heart
                className={`h-4 w-4 ${
                  isLiked ? "fill-red-500 text-red-500" : "fill-none"
                }`}
              />
              {likesCount > 0 && <span>{likesCount}</span>}
            </button>
          </div>
        </div>
      </div>

      {photo.caption && (
        <div className="px-3 py-2">
          <p className="text-xs text-muted-foreground line-clamp-2">
            {photo.caption}
          </p>
        </div>
      )}
    </div>
  );
}

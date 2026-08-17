"use client";

import { useState, useTransition, useCallback } from "react";
import { Camera, Plus, ImageIcon, Film } from "lucide-react";
import { Button } from "@attendly/ui/components";
import { PhotoCard } from "./photo-card";
import { UploadPhotoDialog } from "./upload-photo-dialog";
import { PhotoDetailModal } from "./photo-detail-modal";
import { getPhotos } from "@/features/photos/queries";
import type { BoothFrame } from "@/features/photo-booth/constants";

type Tab = "all" | "photos" | "videos";

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

interface PhotoGalleryProps {
  eventId: string;
  initialPhotos: Photo[];
  initialTotal: number;
  counts: {
    total: number;
    photos: number;
    videos: number;
  };
  frames: BoothFrame[];
}

export function PhotoGallery({
  eventId,
  initialPhotos,
  initialTotal,
  counts,
  frames,
}: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [total, setTotal] = useState(initialTotal);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [page, setPage] = useState(1);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [isLoadingMore, startLoadingMore] = useTransition();
  const [isTabLoading, startTabLoading] = useTransition();

  const handleLikeToggle = useCallback((photoId: string) => {
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === photoId
          ? {
              ...p,
              is_liked: !p.is_liked,
              likes_count: p.is_liked ? p.likes_count - 1 : p.likes_count + 1,
            }
          : p
      )
    );
  }, []);

  const pageSize = 20;
  const hasMore = photos.length < total;

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    setPage(1);
    startTabLoading(async () => {
      try {
        const result = await getPhotos(eventId, { tab, page: 1, pageSize });
        setPhotos(result.photos as Photo[]);
        setTotal(result.total);
      } catch {
        // keep current state
      }
    });
  }

  function handleLoadMore() {
    const nextPage = page + 1;
    startLoadingMore(async () => {
      try {
        const result = await getPhotos(eventId, {
          tab: activeTab,
          page: nextPage,
          pageSize,
        });
        setPhotos((prev) => [...prev, ...(result.photos as Photo[])]);
        setTotal(result.total);
        setPage(nextPage);
      } catch {
        // keep current state
      }
    });
  }

  const tabs: { key: Tab; label: string; count: number; icon: React.ReactNode }[] = [
    { key: "all", label: "All Media", count: counts.total, icon: <Camera className="h-4 w-4" /> },
    { key: "photos", label: "Photos", count: counts.photos, icon: <ImageIcon className="h-4 w-4" /> },
    { key: "videos", label: "Videos", count: counts.videos, icon: <Film className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Photos</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {counts.total} {counts.total === 1 ? "photo" : "photos"}
          </p>
        </div>
        <Button onClick={() => setShowUpload(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Share a photo
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.icon}
            {tab.label}
            <span className="ml-1 text-xs text-muted-foreground">
              ({tab.count})
            </span>
          </button>
        ))}
      </div>

      {/* Grid */}
      {isTabLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border bg-muted/30 aspect-square animate-pulse"
            />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Camera className="h-12 w-12 text-muted-foreground/40" />
          <p className="mt-4 text-sm text-muted-foreground">
            No photos yet. Be the first to share!
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className="cursor-pointer"
                onClick={() => setSelectedPhotoIndex(index)}
              >
                <PhotoCard photo={photo} />
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Upload Dialog */}
      <UploadPhotoDialog
        eventId={eventId}
        open={showUpload}
        onClose={() => setShowUpload(false)}
        frames={frames}
      />

      {/* Photo Detail Modal */}
      <PhotoDetailModal
        photos={photos}
        initialIndex={selectedPhotoIndex ?? 0}
        open={selectedPhotoIndex !== null}
        onClose={() => setSelectedPhotoIndex(null)}
        onLikeToggle={handleLikeToggle}
      />
    </div>
  );
}

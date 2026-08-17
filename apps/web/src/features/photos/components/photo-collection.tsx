"use client";

import { useState, useTransition, useCallback } from "react";
import Image from "next/image";
import { Camera, Video, Heart, Trash2, Download, ImageIcon, Film, Plus, DownloadCloud } from "lucide-react";
import { Button, Card, CardContent, ConfirmDialog } from "@attendly/ui/components";
import { toast } from "sonner";
import { getPhotos } from "@/features/photos/queries";
import { deletePhoto } from "@/features/photos/actions";
import { UploadPhotoDialog } from "./upload-photo-dialog";
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
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface PhotoCollectionProps {
  eventId: string;
  initialPhotos: Photo[];
  initialTotal: number;
  counts: { total: number; photos: number; videos: number };
  stats: { photoCount: number; videoCount: number; totalLikes: number };
  frames?: BoothFrame[];
}

export function PhotoCollection({
  eventId,
  initialPhotos,
  initialTotal,
  counts,
  stats,
  frames = [],
}: PhotoCollectionProps) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [total, setTotal] = useState(initialTotal);
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [isLoadingMore, startLoadingMore] = useTransition();
  const [isTabLoading, startTabLoading] = useTransition();
  const [isDeleting, startDeleting] = useTransition();
  const [showUpload, setShowUpload] = useState(false);

  const handleUploadComplete = useCallback(() => {
    startTabLoading(async () => {
      try {
        const result = await getPhotos(eventId, { tab: activeTab, page: 1, pageSize: 20 });
        setPhotos(result.photos as Photo[]);
        setTotal(result.total);
        setPage(1);
      } catch {
        // keep current state
      }
    });
  }, [eventId, activeTab]);

  const pageSize = 20;
  const hasMore = photos.length < total;

  const handleTabChange = useCallback(
    (tab: Tab) => {
      setActiveTab(tab);
      setPage(1);
      setSelectedIds(new Set());
      startTabLoading(async () => {
        try {
          const result = await getPhotos(eventId, { tab, page: 1, pageSize });
          setPhotos(result.photos as Photo[]);
          setTotal(result.total);
        } catch {
          // keep current state
        }
      });
    },
    [eventId]
  );

  const handleLoadMore = useCallback(() => {
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
  }, [eventId, activeTab, page]);

  const toggleSelect = useCallback((photoId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      return next;
    });
  }, []);

  const handleDeleteSingle = useCallback(() => {
    if (!deleteTarget) return;
    const targetId = deleteTarget;
    setDeleteTarget(null);
    startDeleting(async () => {
      try {
        await deletePhoto(targetId);
        setPhotos((prev) => prev.filter((p) => p.id !== targetId));
        setTotal((prev) => prev - 1);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(targetId);
          return next;
        });
        toast.success("Photo deleted");
      } catch {
        toast.error("Failed to delete photo");
      }
    });
  }, [deleteTarget]);

  const handleBulkDelete = useCallback(() => {
    setShowBulkDelete(false);
    const ids = Array.from(selectedIds);
    startDeleting(async () => {
      try {
        await Promise.all(ids.map((id) => deletePhoto(id)));
        setPhotos((prev) => prev.filter((p) => !selectedIds.has(p.id)));
        setTotal((prev) => prev - ids.length);
        setSelectedIds(new Set());
        toast.success(`Deleted ${ids.length} photo${ids.length > 1 ? "s" : ""}`);
      } catch {
        toast.error("Failed to delete some photos");
      }
    });
  }, [selectedIds]);

  const tabs: { key: Tab; label: string; count: number; icon: React.ReactNode }[] = [
    { key: "all", label: "All Media", count: counts.total, icon: <Camera className="h-4 w-4" /> },
    { key: "photos", label: "Photos", count: counts.photos, icon: <ImageIcon className="h-4 w-4" /> },
    { key: "videos", label: "Videos", count: counts.videos, icon: <Film className="h-4 w-4" /> },
  ];

  const statCards = [
    { label: "Photos", value: stats.photoCount, icon: Camera },
    { label: "Videos", value: stats.videoCount, icon: Video },
    { label: "Total Likes", value: stats.totalLikes, icon: Heart },
  ];

  return (
    <div className="space-y-6">
      {/* Description + Action Buttons */}
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Add, view, and manage photos gathered from the app.
        </p>
        <div className="flex items-center gap-3">
          <Button onClick={() => setShowUpload(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add photo
          </Button>
          {photos.length > 0 && (
            <Button
              variant="outline"
              onClick={() => {
                photos.forEach((photo) => {
                  const a = document.createElement("a");
                  a.href = photo.image_url;
                  a.download = "";
                  a.target = "_blank";
                  a.rel = "noopener noreferrer";
                  a.click();
                });
                toast.success("Downloading photos...");
              }}
            >
              <DownloadCloud className="mr-1.5 h-4 w-4" />
              Download all photos
            </Button>
          )}
        </div>
      </div>

      {/* Stats Header */}
      <div className="grid grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
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

        {selectedIds.size > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowBulkDelete(true)}
            disabled={isDeleting}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Delete {selectedIds.size} selected
          </Button>
        )}
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
            No photos uploaded yet. Photos will appear here when attendees share them.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="group relative rounded-xl overflow-hidden border bg-card"
              >
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

                  {/* Checkbox overlay */}
                  <label
                    className="absolute top-2 left-2 z-10 cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(photo.id)}
                      onChange={() => toggleSelect(photo.id)}
                      className="h-5 w-5 rounded border-2 border-white bg-black/30 text-primary accent-primary cursor-pointer"
                    />
                  </label>

                  {/* Hover action buttons */}
                  <div className="absolute top-2 right-2 z-10 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(photo.id);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-red-600 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <a
                      href={photo.image_url}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white hover:bg-primary transition-colors"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </div>

                  {/* Bottom overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-3 pb-2.5 pt-8">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-white truncate">
                        By {photo.author?.display_name ?? "Unknown"}
                      </span>
                      <div className="flex items-center gap-2 text-xs text-white">
                        {photo.likes_count > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Heart className="h-3.5 w-3.5" />
                            {photo.likes_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
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

      {/* Single delete confirmation */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete photo?"
        description="This action cannot be undone. The photo will be permanently deleted."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={handleDeleteSingle}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Bulk delete confirmation */}
      <ConfirmDialog
        open={showBulkDelete}
        title={`Delete ${selectedIds.size} photo${selectedIds.size > 1 ? "s" : ""}?`}
        description="This action cannot be undone. The selected photos will be permanently deleted."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={handleBulkDelete}
        onCancel={() => setShowBulkDelete(false)}
      />

      {/* Upload Dialog */}
      <UploadPhotoDialog
        eventId={eventId}
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onUploadComplete={handleUploadComplete}
        frames={frames}
      />
    </div>
  );
}

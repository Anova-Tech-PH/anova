"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import {
  Heart,
  Send,
  Camera,
  ArrowLeft,
  MessageSquare,
  Lightbulb,
  ImageIcon,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button, Card, Input } from "@attendly/ui/components";
import {
  submitContestEntry,
  toggleContestLike,
} from "../contest-actions";
import { uploadContestPhoto } from "../lib/upload";
import type { Contest, ContestEntry } from "../contest-queries";
import Link from "next/link";
import type { BoothFrame } from "@/features/photo-booth/constants";
import { FrameSelector } from "@/features/photos/components/frame-selector";
import { renderFrameOnPhoto } from "@/features/photos/lib/render-frame";

const TYPE_ICONS: Record<string, typeof Camera> = {
  photo: Camera,
  caption: MessageSquare,
  icebreaker: Lightbulb,
};

const TYPE_LABELS: Record<string, string> = {
  photo: "Photo Contest",
  caption: "Caption Contest",
  icebreaker: "Icebreaker",
};

export function ContestGallery({
  contest,
  entries: initialEntries,
  userLikes: initialLikes,
  userId,
  basePath,
  frames = [],
}: {
  contest: Contest;
  entries: ContestEntry[];
  userLikes: string[];
  userId: string | null;
  basePath: string;
  frames?: BoothFrame[];
}) {
  const [entries, setEntries] = useState(initialEntries);
  const [likedIds, setLikedIds] = useState(new Set(initialLikes));
  const [isPending, startTransition] = useTransition();
  const [newText, setNewText] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Frame selection state for photo contests
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null);
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);

  const Icon = TYPE_ICONS[contest.type] ?? Camera;
  const label = TYPE_LABELS[contest.type] ?? contest.type;

  // ── Like toggle ──────────────────────────────────────────
  function handleLike(entryId: string) {
    if (!userId) {
      toast.error("Please sign in to like entries.");
      return;
    }

    const wasLiked = likedIds.has(entryId);

    // Optimistic update
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (wasLiked) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId
          ? { ...e, likes_count: e.likes_count + (wasLiked ? -1 : 1) }
          : e
      )
    );

    startTransition(async () => {
      try {
        await toggleContestLike(entryId, userId);
      } catch {
        // Revert on error
        setLikedIds((prev) => {
          const next = new Set(prev);
          if (wasLiked) next.add(entryId);
          else next.delete(entryId);
          return next;
        });
        setEntries((prev) =>
          prev.map((e) =>
            e.id === entryId
              ? { ...e, likes_count: e.likes_count + (wasLiked ? 1 : -1) }
              : e
          )
        );
        toast.error("Failed to update like. Please try again.");
      }
    });
  }

  // ── Photo upload (two-step: pick file → optional frame → submit) ──
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    // If frames are available, show the preview + frame selector
    if (frames.length > 0) {
      setPendingFile(file);
      setPendingPreviewUrl(URL.createObjectURL(file));
      setSelectedFrameId(null);
    } else {
      // No frames — upload directly
      uploadPhoto(file);
    }

    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const cancelPendingUpload = useCallback(() => {
    if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    setPendingFile(null);
    setPendingPreviewUrl(null);
    setSelectedFrameId(null);
  }, [pendingPreviewUrl]);

  async function uploadPhoto(file: File) {
    if (!userId) return;

    setUploading(true);
    try {
      // Apply frame if selected
      let uploadBlob: Blob = file;
      if (selectedFrameId) {
        const frame = frames.find((f) => f.id === selectedFrameId);
        if (frame) {
          uploadBlob = await renderFrameOnPhoto(file, {
            template: frame.template,
            message: frame.message,
            color: frame.color,
          });
        }
      }

      const formData = new FormData();
      formData.append("file", new File([uploadBlob], file.name, { type: uploadBlob.type || file.type }));
      const imageUrl = await uploadContestPhoto(formData);

      const entry = await submitContestEntry(contest.id, userId, {
        image_url: imageUrl,
      });

      const newEntry: ContestEntry = {
        id: (entry as Record<string, unknown>).id as string,
        contest_id: contest.id,
        user_id: userId,
        content: null,
        image_url: imageUrl,
        likes_count: 0,
        created_at: new Date().toISOString(),
        profiles: null,
      };
      setEntries((prev) => [newEntry, ...prev]);
      toast.success("Photo submitted successfully!");

      // Clear pending state
      cancelPendingUpload();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to upload photo."
      );
    } finally {
      setUploading(false);
    }
  }

  // ── Text submission (caption / icebreaker) ───────────────
  function handleTextSubmit() {
    if (!userId) {
      toast.error("Please sign in to submit an entry.");
      return;
    }
    if (!newText.trim()) return;

    const text = newText.trim();
    setNewText("");

    startTransition(async () => {
      try {
        const entry = await submitContestEntry(contest.id, userId, {
          content: text,
        });

        const newEntry: ContestEntry = {
          id: (entry as Record<string, unknown>).id as string,
          contest_id: contest.id,
          user_id: userId,
          content: text,
          image_url: null,
          likes_count: 0,
          created_at: new Date().toISOString(),
          profiles: null,
        };
        setEntries((prev) => [newEntry, ...prev]);
        toast.success("Entry submitted successfully!");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to submit entry."
        );
        setNewText(text);
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href={basePath}
          className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to contests
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[oklch(0.445_0.107_195)]/10">
            <Icon className="h-5 w-5 text-[oklch(0.445_0.107_195)]" />
          </div>
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-[oklch(0.445_0.107_195)]">
              {label}
            </span>
            <h1 className="text-xl font-semibold">{contest.title}</h1>
          </div>
        </div>
        {contest.description && (
          <p className="mt-2 text-sm text-muted-foreground">
            {contest.description}
          </p>
        )}
      </div>

      {/* ── Prize Info ──────────────────────────────────────── */}
      {(contest.prize_description || contest.theme || contest.winner_criteria) && (
        <div className="rounded-xl border bg-amber-50/50 p-4 space-y-3">
          {contest.prize_description && (
            <div>
              <h3 className="text-sm font-semibold text-amber-900">
                Prize Information
              </h3>
              <p className="mt-0.5 text-sm text-amber-800">
                {contest.prize_description}
              </p>
            </div>
          )}
          {contest.theme && (
            <div>
              <h3 className="text-sm font-semibold">Contest theme</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {contest.theme}
              </p>
            </div>
          )}
          {contest.winner_criteria && (
            <div>
              <h3 className="text-sm font-semibold">How winners are chosen</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {contest.winner_criteria}
              </p>
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold">How to participate</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {contest.type === "photo"
                ? "Post photos and get as many people as you can to like them."
                : contest.type === "caption"
                  ? "Submit your best caption for the image above."
                  : "Share your answer to the icebreaker prompt."}
            </p>
          </div>
        </div>
      )}

      {/* ── Photo Contest ─────────────────────────────────── */}
      {contest.type === "photo" && (
        <>
          {/* Upload button */}
          {userId && contest.status === "active" && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleFileSelect}
              />
              {!pendingFile && (
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="gap-2"
                >
                  <Camera className="h-4 w-4" />
                  {uploading ? "Uploading..." : "Upload Photo"}
                </Button>
              )}

              {/* Frame selection preview */}
              {pendingFile && pendingPreviewUrl && (
                <Card className="space-y-4 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Preview &amp; Frame</h3>
                    <button
                      type="button"
                      onClick={cancelPendingUpload}
                      className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mx-auto max-w-xs overflow-hidden rounded-lg border">
                    <img
                      src={pendingPreviewUrl}
                      alt="Photo preview"
                      className="w-full object-contain"
                    />
                  </div>

                  {frames.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-medium text-muted-foreground">
                        Select a frame (optional)
                      </p>
                      <FrameSelector
                        frames={frames}
                        selectedFrameId={selectedFrameId}
                        onSelect={setSelectedFrameId}
                      />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={cancelPendingUpload}
                      disabled={uploading}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => uploadPhoto(pendingFile)}
                      disabled={uploading}
                      className="gap-2"
                    >
                      <Camera className="h-4 w-4" />
                      {uploading ? "Uploading..." : "Submit Photo"}
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* Photo gallery grid */}
          {entries.length === 0 ? (
            <div className="rounded-xl border p-8 text-center">
              <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                No photos yet. Be the first to share!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {entries.map((entry) => (
                <Card key={entry.id} className="overflow-hidden">
                  {entry.image_url && (
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={entry.image_url}
                        alt={`Photo by ${entry.profiles?.full_name ?? "Anonymous"}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between px-2.5 py-2">
                    <span className="truncate text-xs text-muted-foreground">
                      {entry.profiles?.full_name ?? "Anonymous"}
                    </span>
                    <button
                      onClick={() => handleLike(entry.id)}
                      disabled={isPending}
                      className="flex items-center gap-1 text-xs"
                    >
                      <Heart
                        className={`h-3.5 w-3.5 transition-colors ${
                          likedIds.has(entry.id)
                            ? "fill-red-500 text-red-500"
                            : "text-muted-foreground hover:text-red-400"
                        }`}
                      />
                      <span>{entry.likes_count}</span>
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Caption Contest ───────────────────────────────── */}
      {contest.type === "caption" && (
        <>
          {/* Hero image */}
          {contest.image_url && (
            <div className="overflow-hidden rounded-xl border">
              <img
                src={contest.image_url}
                alt={contest.title}
                className="w-full object-cover"
              />
            </div>
          )}

          {/* Submit caption */}
          {userId && contest.status === "active" && (
            <div className="flex gap-2">
              <Input
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Write your caption..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleTextSubmit();
                  }
                }}
              />
              <Button
                onClick={handleTextSubmit}
                disabled={isPending || !newText.trim()}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Caption list */}
          {entries.length === 0 ? (
            <div className="rounded-xl border p-8 text-center">
              <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                No captions yet. Be the first!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <Card
                  key={entry.id}
                  className="flex items-start gap-3 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{entry.content}</p>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {entry.profiles?.full_name ?? "Anonymous"}
                    </span>
                  </div>
                  <button
                    onClick={() => handleLike(entry.id)}
                    disabled={isPending}
                    className="flex shrink-0 items-center gap-1 text-xs"
                  >
                    <Heart
                      className={`h-3.5 w-3.5 transition-colors ${
                        likedIds.has(entry.id)
                          ? "fill-red-500 text-red-500"
                          : "text-muted-foreground hover:text-red-400"
                      }`}
                    />
                    <span>{entry.likes_count}</span>
                  </button>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Icebreaker Contest ────────────────────────────── */}
      {contest.type === "icebreaker" && (
        <>
          {/* Submit answer */}
          {userId && contest.status === "active" && (
            <div className="flex gap-2">
              <Input
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="Share your answer..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleTextSubmit();
                  }
                }}
              />
              <Button
                onClick={handleTextSubmit}
                disabled={isPending || !newText.trim()}
                size="icon"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Answer list */}
          {entries.length === 0 ? (
            <div className="rounded-xl border p-8 text-center">
              <Lightbulb className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                No answers yet. Break the ice!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <Card
                  key={entry.id}
                  className="flex items-start gap-3 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{entry.content}</p>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {entry.profiles?.full_name ?? "Anonymous"}
                    </span>
                  </div>
                  <button
                    onClick={() => handleLike(entry.id)}
                    disabled={isPending}
                    className="flex shrink-0 items-center gap-1 text-xs"
                  >
                    <Heart
                      className={`h-3.5 w-3.5 transition-colors ${
                        likedIds.has(entry.id)
                          ? "fill-red-500 text-red-500"
                          : "text-muted-foreground hover:text-red-400"
                      }`}
                    />
                    <span>{entry.likes_count}</span>
                  </button>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Not signed in prompt */}
      {!userId && (
        <div className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
          Sign in to participate and like entries.
        </div>
      )}
    </div>
  );
}

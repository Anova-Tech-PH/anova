"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import Image from "next/image";
import {
  Upload,
  X,
  ImagePlus,
  Clipboard,
  Camera,
  ChevronLeft,
  CheckCircle2,
} from "lucide-react";
import { Button, Textarea } from "@attendly/ui/components";
import { ModalOverlay } from "@attendly/ui/components";
import { uploadPhoto } from "@/features/photos/actions";
import { FrameSelector } from "@/features/photos/components/frame-selector";
import { renderFrameOnPhoto } from "@/features/photos/lib/render-frame";
import type { BoothFrame } from "@/features/photo-booth/constants";
import { toast } from "sonner";

const MAX_PHOTOS = 9;

type Step = "method" | "preview" | "done";

interface PhotoEntry {
  file: File;
  previewUrl: string;
  caption: string;
}

interface UploadPhotoDialogProps {
  eventId: string;
  open: boolean;
  onClose: () => void;
  frames: BoothFrame[];
}

export function UploadPhotoDialog({
  eventId,
  open,
  onClose,
  frames,
}: UploadPhotoDialogProps) {
  const [step, setStep] = useState<Step>("method");
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const activePhoto = photos[activeIndex] ?? null;

  function addFiles(files: File[]) {
    const imageFiles = files
      .filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"))
      .slice(0, MAX_PHOTOS);
    if (imageFiles.length === 0) {
      toast.error("No valid image files selected");
      return;
    }
    const entries: PhotoEntry[] = imageFiles.map((f) => ({
      file: f,
      previewUrl: URL.createObjectURL(f),
      caption: "",
    }));
    setPhotos(entries);
    setActiveIndex(0);
    setStep("preview");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;
    addFiles(Array.from(selected));
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      addFiles(droppedFiles);
    }
  }

  async function handlePasteFromClipboard() {
    try {
      const clipboardItems = await navigator.clipboard.read();
      const imageFiles: File[] = [];
      for (const item of clipboardItems) {
        const imageType = item.types.find((t) => t.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = new File([blob], `clipboard-${Date.now()}.png`, {
            type: imageType,
          });
          imageFiles.push(file);
        }
      }
      if (imageFiles.length === 0) {
        toast.error("No image found in clipboard");
        return;
      }
      addFiles(imageFiles);
    } catch {
      toast.error("Could not read clipboard. Please allow clipboard access.");
    }
  }

  function updateCaption(index: number, caption: string) {
    setPhotos((prev) =>
      prev.map((p, i) => (i === index ? { ...p, caption } : p))
    );
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].previewUrl);
      updated.splice(index, 1);
      return updated;
    });
    if (activeIndex >= photos.length - 1 && activeIndex > 0) {
      setActiveIndex(activeIndex - 1);
    }
    if (photos.length <= 1) {
      setStep("method");
    }
  }

  const resetAll = useCallback(() => {
    photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPhotos([]);
    setActiveIndex(0);
    setSelectedFrameId(null);
    setStep("method");
    setIsDragOver(false);
  }, [photos]);

  function resetAndClose() {
    resetAll();
    onClose();
  }

  function handleUpload() {
    if (photos.length === 0) return;

    const selectedFrame = frames.find((f) => f.id === selectedFrameId) ?? null;

    startTransition(async () => {
      try {
        for (const photo of photos) {
          let fileToUpload: File = photo.file;

          // Apply frame if selected and it's an image
          if (selectedFrame && photo.file.type.startsWith("image/")) {
            const frameConfig = {
              template: selectedFrame.template,
              message: selectedFrame.message,
              color: selectedFrame.color,
            };
            const framedBlob = await renderFrameOnPhoto(
              photo.file,
              frameConfig
            );
            fileToUpload = new File([framedBlob], photo.file.name, {
              type: "image/jpeg",
            });
          }

          const formData = new FormData();
          formData.append("file", fileToUpload);
          formData.append("caption", photo.caption);
          if (selectedFrameId) {
            formData.append("frameId", selectedFrameId);
          }

          await uploadPhoto(eventId, formData);
        }
        toast.success(
          photos.length > 1
            ? `${photos.length} photos uploaded!`
            : "Photo uploaded!"
        );
        setStep("done");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to upload photo"
        );
      }
    });
  }

  if (!open) return null;

  return (
    <ModalOverlay onClose={resetAndClose}>
      <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          {step === "preview" && (
            <button
              type="button"
              onClick={() => {
                resetAll();
              }}
              className="mr-2 rounded-full p-1 hover:bg-muted transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          <h3 className="text-lg font-semibold flex-1">
            {step === "method" && "Share a Photo"}
            {step === "preview" && "Preview & Frame"}
            {step === "done" && "Photo Shared!"}
          </h3>
          <button
            type="button"
            onClick={resetAndClose}
            className="rounded-full p-1 hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Step 1: Method Selection */}
        {step === "method" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {/* Choose Photos */}
              <label className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 p-6 cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-colors">
                <ImagePlus className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  Choose Photos
                </span>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {/* Drag & Drop */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 transition-colors ${
                  isDragOver
                    ? "border-primary bg-primary/10"
                    : "border-border bg-muted/30 hover:bg-muted/50 hover:border-primary/50"
                }`}
              >
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  Drag & Drop
                </span>
              </div>

              {/* Paste from Clipboard */}
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 p-6 cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-colors"
              >
                <Clipboard className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  Paste Clipboard
                </span>
              </button>

              {/* Take a Selfie (placeholder) */}
              <button
                type="button"
                onClick={() =>
                  toast.info("Selfie capture coming soon")
                }
                className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 p-6 cursor-pointer hover:bg-muted/50 hover:border-primary/50 transition-colors"
              >
                <Camera className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">
                  Take a Selfie
                </span>
              </button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Upload up to {MAX_PHOTOS} photos at once
            </p>
          </div>
        )}

        {/* Step 2: Preview + Frame Selection */}
        {step === "preview" && activePhoto && (
          <div className="space-y-4">
            {/* Active photo preview */}
            <div className="relative rounded-xl overflow-hidden border">
              <button
                type="button"
                onClick={() => removePhoto(activeIndex)}
                className="absolute top-2 right-2 z-10 rounded-full bg-black/50 p-1 text-white hover:bg-black/70 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              {activePhoto.file.type.startsWith("video/") ? (
                <video
                  src={activePhoto.previewUrl}
                  className="w-full max-h-64 object-contain bg-black"
                  controls
                />
              ) : (
                <div className="relative aspect-video">
                  <Image
                    src={activePhoto.previewUrl}
                    alt="Preview"
                    fill
                    className="object-contain bg-black"
                  />
                </div>
              )}
            </div>

            {/* Batch thumbnail strip */}
            {photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {photos.map((photo, index) => (
                  <button
                    key={photo.previewUrl}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={`relative h-14 w-14 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                      index === activeIndex
                        ? "border-primary"
                        : "border-transparent hover:border-muted-foreground/30"
                    }`}
                  >
                    <Image
                      src={photo.previewUrl}
                      alt={`Photo ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
                <span className="flex items-center text-xs text-muted-foreground pl-1">
                  {photos.length}/{MAX_PHOTOS}
                </span>
              </div>
            )}

            {/* Frame Selector */}
            {frames.length > 0 && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Add a frame
                </label>
                <FrameSelector
                  frames={frames}
                  selectedFrameId={selectedFrameId}
                  onSelect={setSelectedFrameId}
                />
              </div>
            )}

            {/* Caption */}
            <Textarea
              value={activePhoto.caption}
              onChange={(e) => updateCaption(activeIndex, e.target.value)}
              placeholder={
                photos.length > 1
                  ? `Caption for photo ${activeIndex + 1} (optional)`
                  : "Add a caption (optional)"
              }
              rows={2}
            />

            {/* Actions */}
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={resetAndClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={isPending}>
                <Upload className="mr-1.5 h-4 w-4" />
                {isPending
                  ? "Uploading..."
                  : photos.length > 1
                    ? `Upload ${photos.length} Photos`
                    : "Upload"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Post-upload (placeholder for Task 12) */}
        {step === "done" && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <div>
              <p className="text-base font-medium">Photo uploaded!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Share it with friends.
              </p>
            </div>
            {/* Social sharing placeholder — Task 12 will replace this */}
            <Button onClick={resetAndClose} className="mt-2">
              Done
            </Button>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}

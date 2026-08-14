"use client";

import { useState, useTransition, useRef } from "react";
import Image from "next/image";
import { Upload, X } from "lucide-react";
import { Button, Textarea } from "@attendly/ui/components";
import { ModalOverlay } from "@attendly/ui/components";
import { uploadPhoto } from "@/features/photos/actions";
import { toast } from "sonner";

interface UploadPhotoDialogProps {
  eventId: string;
  open: boolean;
  onClose: () => void;
}

export function UploadPhotoDialog({
  eventId,
  open,
  onClose,
}: UploadPhotoDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    const url = URL.createObjectURL(selected);
    setPreview(url);
  }

  function clearFile() {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function resetAndClose() {
    clearFile();
    setCaption("");
    onClose();
  }

  function handleUpload() {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("caption", caption);

    startTransition(async () => {
      try {
        await uploadPhoto(eventId, formData);
        toast.success("Photo uploaded!");
        resetAndClose();
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
        <h3 className="text-lg font-semibold mb-4">Share a Photo</h3>

        {!preview ? (
          <label
            className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/30 py-12 cursor-pointer hover:bg-muted/50 transition-colors"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const droppedFile = e.dataTransfer.files[0];
              if (droppedFile) {
                setFile(droppedFile);
                setPreview(URL.createObjectURL(droppedFile));
              }
            }}
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Click or drag & drop to upload
            </span>
            <span className="text-xs text-muted-foreground/60">
              Images & videos accepted
            </span>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        ) : (
          <div className="relative rounded-xl overflow-hidden border">
            <button
              onClick={clearFile}
              className="absolute top-2 right-2 z-10 rounded-full bg-black/50 p-1 text-white hover:bg-black/70 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            {file?.type?.startsWith("video/") ? (
              <video
                src={preview}
                className="w-full max-h-64 object-contain bg-black"
                controls
              />
            ) : (
              <div className="relative aspect-video">
                <Image
                  src={preview}
                  alt="Preview"
                  fill
                  className="object-contain bg-black"
                />
              </div>
            )}
          </div>
        )}

        <div className="mt-4">
          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption (optional)"
            rows={2}
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={resetAndClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={isPending || !file}>
            <Upload className="mr-1.5 h-4 w-4" />
            {isPending ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}

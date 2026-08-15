"use client";

import { useState, useTransition, useRef } from "react";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, ModalOverlay } from "@attendly/ui/components";
import { createFloormap } from "../actions";

interface UploadFloormapDialogProps {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadFloormapDialog({
  eventId,
  open,
  onOpenChange,
}: UploadFloormapDialogProps) {
  const [name, setName] = useState("Floor Map");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Please select an image file (PNG, JPG)");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function resetAndClose() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setName("Floor Map");
    if (fileRef.current) fileRef.current.value = "";
    onOpenChange(false);
  }

  function handleSubmit() {
    if (!file) return;

    const formData = new FormData();
    formData.set("image", file);
    formData.set("name", name);

    startTransition(async () => {
      try {
        await createFloormap(eventId, formData);
        toast.success("Floor map uploaded");
        resetAndClose();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Upload failed"
        );
      }
    });
  }

  if (!open) return null;

  return (
    <ModalOverlay onClose={resetAndClose}>
      <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-semibold">Upload Floor Map</h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Map Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Main Hall, Level 2"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Map Image</label>
            <div
              onClick={() => !isPending && fileRef.current?.click()}
              className="mt-1 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 transition-colors border-muted-foreground/20 hover:border-primary/40 hover:bg-accent/50"
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                className="hidden"
                onChange={handleFileSelect}
              />
              {preview ? (
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-48 rounded-md object-contain"
                />
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Click to upload floor plan image
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    PNG or JPG, max 10MB
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4">
          <Button
            variant="outline"
            onClick={resetAndClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!file || isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Upload"
            )}
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}

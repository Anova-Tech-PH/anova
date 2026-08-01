"use client";

import { useState, useRef } from "react";
import { Image, Camera, BarChart3, Send, X, Plus, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createPost, uploadPostImage } from "../actions";
import { Button } from "@attendly/ui/components";
import { Card } from "@attendly/ui/components";
import { Input } from "@attendly/ui/components";

export function PostComposer({
  eventId,
  onPostCreated,
}: {
  eventId: string;
  onPostCreated: (post: any) => void;
}) {
  const [content, setContent] = useState("");
  const [type, setType] = useState<"text" | "photo" | "poll">("text");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const maxLength = 2000;
  const charCount = content.length;
  const charPercentage = (charCount / maxLength) * 100;

  function addPollOption() {
    if (pollOptions.length < 10) setPollOptions([...pollOptions, ""]);
  }

  function updatePollOption(index: number, value: string) {
    setPollOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  function removePollOption(index: number) {
    if (pollOptions.length > 2) setPollOptions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
    setType("photo");
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const url = await uploadPostImage(formData);
      setImageUrl(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload image");
      setImagePreview(null);
      setType("text");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function removeImage() {
    setImageUrl("");
    setImagePreview(null);
    if (type === "photo") setType("text");
  }

  function reset() {
    setContent("");
    setType("text");
    setImageUrl("");
    setImagePreview(null);
    setPollOptions(["", ""]);
    setIsFocused(false);
  }

  async function handleSubmit() {
    if (!content.trim()) return;
    setLoading(true);

    try {
      const post = await createPost({
        event_id: eventId,
        type,
        content: content.trim(),
        image_url: type === "photo" ? imageUrl : undefined,
        poll_options: type === "poll" ? pollOptions.filter((o) => o.trim()) : undefined,
      });
      onPostCreated({
        ...post,
        liked: false,
        poll_vote_counts: {},
        user_poll_vote: null,
        comments: [],
      });
      reset();
      toast.success("Post created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create post");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card
      className={`p-4 transition-all duration-200 ${
        isFocused ? "ring-2 ring-primary/20 shadow-md" : ""
      }`}
    >
      <div className="flex gap-3">
        {/* Avatar placeholder */}
        <div className="flex-shrink-0 pt-0.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <span className="text-xs font-semibold">You</span>
          </div>
        </div>

        {/* Textarea */}
        <div className="flex-1 min-w-0">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Share something with attendees..."
            rows={3}
            maxLength={maxLength}
            className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Image preview */}
      {imagePreview && (
        <div className="mt-2 ml-12 relative inline-block">
          <img
            src={imagePreview}
            alt="Upload preview"
            className="max-h-48 rounded-lg object-cover"
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
          <button
            onClick={removeImage}
            className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background shadow-md hover:bg-foreground/80 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {type === "poll" && (
        <div className="mt-2 ml-12 space-y-2">
          {pollOptions.map((option, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                type="text"
                value={option}
                onChange={(e) => updatePollOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                className="flex-1"
              />
              {pollOptions.length > 2 && (
                <button onClick={() => removePollOption(i)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          {pollOptions.length < 10 && (
            <button onClick={addPollOption} className="flex items-center gap-1 text-xs text-primary hover:underline">
              <Plus className="h-3 w-3" /> Add option
            </button>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t pt-3 ml-12">
        <div className="flex gap-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className={`group relative rounded-lg p-2.5 transition-colors ${
              imagePreview ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Image className="h-5 w-5" />
            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-[10px] text-background opacity-0 transition-opacity group-hover:opacity-100">
              Photo
            </span>
          </button>
          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
            className={`group relative rounded-lg p-2.5 transition-colors ${
              "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <Camera className="h-5 w-5" />
            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-[10px] text-background opacity-0 transition-opacity group-hover:opacity-100">
              Camera
            </span>
          </button>
          <button
            onClick={() => setType(type === "poll" ? "text" : "poll")}
            className={`group relative rounded-lg p-2.5 transition-colors ${
              type === "poll" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            <BarChart3 className="h-5 w-5" />
            <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-foreground px-2 py-1 text-[10px] text-background opacity-0 transition-opacity group-hover:opacity-100">
              Poll
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Character count indicator */}
          {content.length > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="relative h-5 w-5">
                <svg className="h-5 w-5 -rotate-90" viewBox="0 0 20 20">
                  <circle
                    cx="10"
                    cy="10"
                    r="8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-muted/30"
                  />
                  <circle
                    cx="10"
                    cy="10"
                    r="8"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray={`${2 * Math.PI * 8}`}
                    strokeDashoffset={`${2 * Math.PI * 8 * (1 - charPercentage / 100)}`}
                    className={`transition-all duration-300 ${
                      charPercentage >= 95
                        ? "text-destructive"
                        : charPercentage >= 80
                          ? "text-yellow-500"
                          : "text-primary"
                    }`}
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              {charPercentage >= 80 && (
                <span
                  className={`text-[11px] tabular-nums ${
                    charPercentage >= 95 ? "text-destructive font-medium" : "text-muted-foreground"
                  }`}
                >
                  {maxLength - charCount}
                </span>
              )}
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={loading || uploading || !content.trim() || (type === "poll" && pollOptions.filter((o) => o.trim()).length < 2)}
            size="sm"
          >
            <Send className="h-3.5 w-3.5" />
            Post
          </Button>
        </div>
      </div>
    </Card>
  );
}

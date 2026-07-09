"use client";

import { useState } from "react";
import { Image, BarChart3, Send, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { createPost } from "../actions";

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
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [loading, setLoading] = useState(false);

  function addPollOption() {
    if (pollOptions.length < 10) setPollOptions([...pollOptions, ""]);
  }

  function updatePollOption(index: number, value: string) {
    setPollOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  function removePollOption(index: number) {
    if (pollOptions.length > 2) setPollOptions((prev) => prev.filter((_, i) => i !== index));
  }

  function reset() {
    setContent("");
    setType("text");
    setImageUrl("");
    setPollOptions(["", ""]);
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
    <div className="rounded-xl border bg-card p-4">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Share something with attendees..."
        rows={3}
        maxLength={2000}
        className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />

      {type === "photo" && (
        <div className="mt-2">
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="Image URL..."
            className="w-full rounded-lg border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      )}

      {type === "poll" && (
        <div className="mt-2 space-y-2">
          {pollOptions.map((option, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={option}
                onChange={(e) => updatePollOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                className="flex-1 rounded-lg border bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
              />
              {pollOptions.length > 2 && (
                <button onClick={() => removePollOption(i)} className="text-muted-foreground hover:text-destructive">
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

      <div className="mt-3 flex items-center justify-between border-t pt-3">
        <div className="flex gap-1">
          <button
            onClick={() => setType(type === "photo" ? "text" : "photo")}
            className={`rounded-lg p-2 ${type === "photo" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"}`}
          >
            <Image className="h-4 w-4" />
          </button>
          <button
            onClick={() => setType(type === "poll" ? "text" : "poll")}
            className={`rounded-lg p-2 ${type === "poll" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"}`}
          >
            <BarChart3 className="h-4 w-4" />
          </button>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || !content.trim() || (type === "poll" && pollOptions.filter((o) => o.trim()).length < 2)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
          Post
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useTransition } from "react";
import { Pencil, Check, Loader2 } from "lucide-react";
import { saveNote } from "../actions";

export function NoteButton({
  sessionId,
  initialContent,
}: {
  sessionId: string;
  initialContent?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState(initialContent ?? "");
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleToggle() {
    setOpen(!open);
    if (!open) {
      // Focus textarea when opening
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }

  function handleBlur() {
    if (content === (initialContent ?? "")) return;

    startTransition(async () => {
      await saveNote(sessionId, content);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div>
      <button
        onClick={handleToggle}
        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        type="button"
      >
        <Pencil className="h-3 w-3" />
        {initialContent ? "Edit notes" : "Add notes"}
      </button>

      {open && (
        <div className="mt-2">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onBlur={handleBlur}
            placeholder="Write your notes here..."
            rows={4}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
          />
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            {isPending && (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </span>
            )}
            {saved && !isPending && (
              <span className="flex items-center gap-1 text-green-600">
                <Check className="h-3 w-3" />
                Saved
              </span>
            )}
            {!isPending && !saved && (
              <span>Auto-saves when you click away</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useRef, useTransition } from "react";
import { Pencil, Check, Loader2, StickyNote } from "lucide-react";
import { saveNote } from "../actions";
import { RichTextEditor } from "@/shared/components/rich-text-editor";

const MAX_LENGTH = 2000;

/**
 * Inline button for schedule list view — toggles a small note editor.
 */
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
            placeholder="Take notes on the session, such as key takeaways, insights, memorable quotes, and more"
            rows={4}
            maxLength={MAX_LENGTH}
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
            <span className="ml-auto">{content.length}/{MAX_LENGTH}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Whova-style card for session detail view — always-visible personal notes section.
 * Uses Tiptap RichTextEditor for rich text formatting (bold, italic, lists, etc.).
 */
export function NoteCard({
  sessionId,
  initialContent,
}: {
  sessionId: string;
  initialContent?: string | null;
}) {
  const [editing, setEditing] = useState(true);
  const [content, setContent] = useState(initialContent ?? "");
  const [savedContent, setSavedContent] = useState(initialContent ?? "");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleEdit() {
    setEditing(true);
  }

  function handleCancel() {
    setContent(savedContent);
    setEditing(false);
  }

  function handleSave() {
    startTransition(async () => {
      await saveNote(sessionId, content);
      setSavedContent(content);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  // Check if content is empty HTML (just <p></p> or empty string)
  const hasContent = savedContent && savedContent !== "<p></p>" && savedContent.replace(/<[^>]*>/g, "").trim().length > 0;

  return (
    <div className="rounded-xl border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <StickyNote className="h-4 w-4 text-muted-foreground" />
          Personal notes
        </h3>
        {saved && (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <Check className="h-3 w-3" />
            Saved
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        {editing ? (
          <>
            <RichTextEditor
              content={content}
              onChange={setContent}
              placeholder="Take notes on the session, such as key takeaways, insights, memorable quotes, and more"
            />
            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isPending}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save"
                )}
              </button>
            </div>
          </>
        ) : hasContent ? (
          <>
            <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: savedContent }} />
            <button
              type="button"
              onClick={handleEdit}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <Pencil className="h-3 w-3" />
              Edit notes
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleEdit}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-6 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <Pencil className="h-4 w-4" />
            Add a note
          </button>
        )}
      </div>
    </div>
  );
}

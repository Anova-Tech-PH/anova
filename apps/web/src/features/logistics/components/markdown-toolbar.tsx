"use client";

import { useRef, useCallback } from "react";
import { Bold, Italic, Link, List } from "lucide-react";

interface MarkdownTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

function wrapSelection(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string,
  onChange: (value: string) => void
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selected = text.substring(start, end) || "text";
  const newText =
    text.substring(0, start) + before + selected + after + text.substring(end);
  onChange(newText);

  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(
      start + before.length,
      start + before.length + selected.length
    );
  });
}

function insertAtCursor(
  textarea: HTMLTextAreaElement,
  insertion: string,
  onChange: (value: string) => void
) {
  const start = textarea.selectionStart;
  const text = textarea.value;
  const newText = text.substring(0, start) + insertion + text.substring(start);
  onChange(newText);

  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(
      start + insertion.length,
      start + insertion.length
    );
  });
}

export function MarkdownTextarea({
  value,
  onChange,
  placeholder,
  rows = 6,
}: MarkdownTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleBold = useCallback(() => {
    if (textareaRef.current)
      wrapSelection(textareaRef.current, "**", "**", onChange);
  }, [onChange]);

  const handleItalic = useCallback(() => {
    if (textareaRef.current)
      wrapSelection(textareaRef.current, "*", "*", onChange);
  }, [onChange]);

  const handleLink = useCallback(() => {
    if (textareaRef.current)
      wrapSelection(textareaRef.current, "[", "](url)", onChange);
  }, [onChange]);

  const handleList = useCallback(() => {
    if (textareaRef.current)
      insertAtCursor(textareaRef.current, "\n- ", onChange);
  }, [onChange]);

  return (
    <div className="rounded-lg border">
      <div className="flex items-center gap-0.5 border-b px-2 py-1">
        <button
          type="button"
          onClick={handleBold}
          className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted"
          aria-label="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleItalic}
          className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted"
          aria-label="Italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleLink}
          className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted"
          aria-label="Link"
        >
          <Link className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleList}
          className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted"
          aria-label="List"
        >
          <List className="h-3.5 w-3.5" />
        </button>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-y bg-transparent px-3 py-2 text-sm outline-none"
      />
    </div>
  );
}

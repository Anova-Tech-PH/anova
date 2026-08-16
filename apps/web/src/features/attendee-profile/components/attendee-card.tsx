"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Star,
  Eye,
  Hand,
  Pencil,
  Send,
  Loader2,
  Check,
} from "lucide-react";
import { Avatar, Button } from "@attendly/ui/components";
import { toggleAttendeeBookmark, saveAttendeeNote } from "@/features/attendee-profile/actions";
import { sendMessage } from "@/features/messaging/actions";

export interface AttendeeCardProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  title: string | null;
  company: string | null;
  location: string | null;
}

interface AttendeeCardProps {
  profile: AttendeeCardProfile;
  eventId: string;
  basePath: string;
  isBookmarked: boolean;
  categoryName?: string;
  categoryColor?: string;
  noteContent?: string;
}

export function AttendeeCard({
  profile,
  eventId,
  basePath,
  isBookmarked: initialBookmarked,
  categoryName,
  categoryColor,
  noteContent = "",
}: AttendeeCardProps) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [isPending, startTransition] = useTransition();

  const [showMessage, setShowMessage] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageLoading, setMessageLoading] = useState(false);
  const [messageSent, setMessageSent] = useState(false);

  const [showNotes, setShowNotes] = useState(false);
  const [noteText, setNoteText] = useState(noteContent);
  const [noteLoading, setNoteLoading] = useState(false);

  function handleBookmark() {
    setBookmarked((prev) => !prev);
    startTransition(async () => {
      try {
        await toggleAttendeeBookmark(eventId, profile.id);
      } catch {
        setBookmarked((prev) => !prev);
      }
    });
  }

  async function handleSendMessage() {
    if (!messageText.trim()) return;
    setMessageLoading(true);
    try {
      await sendMessage(eventId, profile.id, messageText.trim());
      setMessageSent(true);
      setMessageText("");
      setTimeout(() => {
        setShowMessage(false);
        setMessageSent(false);
      }, 2000);
    } catch {
      // ignore
    } finally {
      setMessageLoading(false);
    }
  }

  async function handleSaveNote() {
    setNoteLoading(true);
    try {
      await saveAttendeeNote(profile.id, noteText);
      setShowNotes(false);
    } catch {
      // ignore
    } finally {
      setNoteLoading(false);
    }
  }

  const subtitle = [profile.title, profile.company]
    .filter(Boolean)
    .join(" @ ");

  return (
    <div className="group rounded-xl border bg-card p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <Avatar
          src={profile.avatar_url}
          name={profile.display_name}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">
            <Link
              href={`${basePath}/${profile.id}`}
              className="text-foreground hover:text-[oklch(0.445_0.107_195)] hover:underline"
            >
              {profile.display_name}
            </Link>
          </h3>
          {subtitle && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {subtitle}
            </p>
          )}
          {profile.location && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground/70">
              {profile.location}
            </p>
          )}
          {categoryName && (
            <span
              data-testid="category-badge"
              className="mt-1 inline-block text-xs font-medium px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: `color-mix(in srgb, ${categoryColor || "blue"} 15%, transparent)`,
                color: categoryColor || "blue",
              }}
            >
              {categoryName}
            </span>
          )}
        </div>
        <button
          onClick={handleBookmark}
          disabled={isPending}
          className="shrink-0 rounded-md p-1.5 transition-colors hover:bg-accent"
          aria-label={bookmarked ? "Remove bookmark" : "Add bookmark"}
        >
          <Star
            className={`h-4 w-4 ${
              bookmarked
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground"
            }`}
          />
        </button>
      </div>

      {/* Action buttons */}
      <div className="mt-3 flex gap-2">
        <Link
          href={`${basePath}/${profile.id}`}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium shadow-sm transition-all hover:bg-accent hover:text-accent-foreground"
        >
          <Eye className="h-3.5 w-3.5" />
          View Profile
        </Link>
        <button
          onClick={() => setShowMessage(!showMessage)}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium shadow-sm transition-all hover:bg-accent hover:text-accent-foreground"
          aria-label="Say Hi"
        >
          <Hand className="h-3.5 w-3.5" />
          Say Hi
        </button>
        <button
          onClick={() => setShowNotes(!showNotes)}
          className="shrink-0 rounded-lg border border-input bg-background p-1.5 shadow-sm transition-all hover:bg-accent"
          aria-label="Take Notes"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Inline Message */}
      {showMessage && (
        <div className="mt-3 space-y-2">
          {messageSent ? (
            <p className="text-sm text-green-600 flex items-center gap-1">
              <Check className="h-4 w-4" /> Message sent!
            </p>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Say something nice..."
                className="flex-1 border rounded-md px-3 py-1.5 text-sm"
                aria-label="Message to attendee"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendMessage();
                }}
              />
              <button
                onClick={handleSendMessage}
                disabled={messageLoading || !messageText.trim()}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                aria-label="Send message"
              >
                {messageLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Inline Notes */}
      {showNotes && (
        <div className="mt-3 space-y-2">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Write your notes about this attendee..."
            className="w-full border rounded-md p-2 text-sm min-h-[60px] resize-y"
            aria-label="Attendee notes"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSaveNote}
              disabled={noteLoading}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {noteLoading ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => setShowNotes(false)}
              className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

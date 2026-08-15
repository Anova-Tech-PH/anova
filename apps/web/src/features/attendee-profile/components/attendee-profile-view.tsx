"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Star,
  MessageCircle,
  MapPin,
  Briefcase,
  Building2,
  Pencil,
  Send,
  Loader2,
  Check,
} from "lucide-react";
import { Avatar, Badge, Button } from "@attendly/ui/components";
import { toggleAttendeeBookmark, saveAttendeeNote } from "@/features/attendee-profile/actions";
import { sendMessage } from "@/features/messaging/actions";

interface Interest {
  id: string;
  name: string;
}

interface AttendeeProfileViewProps {
  profile: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    title: string | null;
    company: string | null;
    location: string | null;
    bio: string | null;
    interests: Interest[];
  };
  eventId: string;
  basePath: string;
  isBookmarked: boolean;
  noteContent?: string;
}

export function AttendeeProfileView({
  profile,
  eventId,
  basePath,
  isBookmarked: initialBookmarked,
  noteContent = "",
}: AttendeeProfileViewProps) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [isPending, startTransition] = useTransition();

  const [showMessage, setShowMessage] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageLoading, setMessageLoading] = useState(false);
  const [messageSent, setMessageSent] = useState(false);

  const [showNotes, setShowNotes] = useState(false);
  const [noteText, setNoteText] = useState(noteContent);
  const [noteLoading, setNoteLoading] = useState(false);

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

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        href={basePath}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to directory
      </Link>

      <div className="rounded-xl border bg-card p-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Avatar
            src={profile.avatar_url}
            name={profile.display_name}
            size="xl"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-foreground">
              {profile.display_name}
            </h1>
            {profile.title && (
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Briefcase className="h-3.5 w-3.5 shrink-0" />
                {profile.title}
              </p>
            )}
            {profile.company && (
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                {profile.company}
              </p>
            )}
            {profile.location && (
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {profile.location}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMessage(!showMessage)}
          >
            <MessageCircle className="mr-1.5 h-4 w-4" />
            Say Hi!
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNotes(!showNotes)}
          >
            <Pencil className="mr-1.5 h-4 w-4" />
            Take Notes
          </Button>
          <Button
            variant={bookmarked ? "secondary" : "outline"}
            size="sm"
            onClick={handleBookmark}
            disabled={isPending}
          >
            <Star
              className={`mr-1.5 h-4 w-4 ${
                bookmarked ? "fill-yellow-400 text-yellow-400" : ""
              }`}
            />
            {bookmarked ? "Bookmarked" : "Bookmark"}
          </Button>
        </div>

        {/* Inline Message */}
        {showMessage && (
          <div className="mt-4 space-y-2">
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
          <div className="mt-4 space-y-2">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Write your notes about this attendee..."
              className="w-full border rounded-md p-2 text-sm min-h-[80px] resize-y"
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

        {/* Bio */}
        {profile.bio && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-foreground">About</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
              {profile.bio}
            </p>
          </div>
        )}

        {/* Interests */}
        {profile.interests.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-foreground">Interests</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {profile.interests.map((interest) => (
                <Badge key={interest.id} variant="primary">
                  {interest.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

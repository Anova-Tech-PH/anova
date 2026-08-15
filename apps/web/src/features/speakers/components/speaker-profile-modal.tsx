"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  X,
  Pencil,
  MessageCircle,
  Bookmark as BookmarkIcon,
  User,
  Check,
  Loader2,
  Send,
} from "lucide-react";
import { ModalOverlay, Card } from "@attendly/ui/components";
import { toggleSpeakerBookmark, saveSpeakerNote } from "../public-actions";
import { sendMessage } from "../../messaging/actions";

export interface SpeakerForModal {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  bio: string | null;
  photo: string | null;
  user_id: string | null;
  sessions: {
    id: string;
    title: string;
    start_time: string | null;
    end_time: string | null;
  }[];
}

interface SpeakerProfileModalProps {
  speaker: SpeakerForModal;
  eventId: string;
  isBookmarked: boolean;
  noteContent: string;
  isLoggedIn: boolean;
  onClose: () => void;
  basePath: string;
}

export function SpeakerProfileModal({
  speaker,
  eventId,
  isBookmarked,
  noteContent,
  isLoggedIn,
  onClose,
  basePath,
}: SpeakerProfileModalProps) {
  const [bookmarked, setBookmarked] = useState(isBookmarked);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  const [showNotes, setShowNotes] = useState(false);
  const [noteText, setNoteText] = useState(noteContent);
  const [noteLoading, setNoteLoading] = useState(false);

  const [showMessage, setShowMessage] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [messageLoading, setMessageLoading] = useState(false);
  const [messageSent, setMessageSent] = useState(false);

  async function handleBookmark() {
    setBookmarkLoading(true);
    try {
      const result = await toggleSpeakerBookmark(eventId, speaker.id);
      setBookmarked(result.bookmarked);
    } catch {
      // ignore
    } finally {
      setBookmarkLoading(false);
    }
  }

  async function handleSaveNote() {
    setNoteLoading(true);
    try {
      await saveSpeakerNote(speaker.id, noteText);
      setShowNotes(false);
    } catch {
      // ignore
    } finally {
      setNoteLoading(false);
    }
  }

  async function handleSendMessage() {
    if (!messageText.trim() || !speaker.user_id) return;
    setMessageLoading(true);
    try {
      await sendMessage(eventId, speaker.user_id, messageText.trim());
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

  function formatDateTime(dateStr: string | null) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  const titleCompany = [speaker.title, speaker.company]
    .filter(Boolean)
    .join(" at ");

  return (
    <ModalOverlay onClose={onClose}>
      <Card className="relative mx-auto max-w-lg w-full p-6">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header: Avatar + Name + Badge */}
        <div className="flex items-start gap-4 mb-6">
          <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden shrink-0">
            {speaker.photo ? (
              <Image
                src={speaker.photo}
                alt={speaker.name}
                width={64}
                height={64}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <User className="h-8 w-8 text-gray-400" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-gray-900">
              {speaker.name}
            </h2>
            {titleCompany && (
              <p className="text-sm text-gray-600">{titleCompany}</p>
            )}
            <span className="inline-block mt-1 text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              Speaker
            </span>
          </div>
        </div>

        {/* Action buttons */}
        {isLoggedIn && (
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setShowNotes(!showNotes)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50"
            >
              <Pencil className="h-4 w-4" />
              Take Notes
            </button>
            {speaker.user_id && (
              <button
                onClick={() => setShowMessage(!showMessage)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50"
              >
                <MessageCircle className="h-4 w-4" />
                Say Hi!
              </button>
            )}
            <button
              onClick={handleBookmark}
              disabled={bookmarkLoading}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50 ${
                bookmarked ? "bg-yellow-50 border-yellow-300 text-yellow-700" : ""
              }`}
            >
              {bookmarkLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : bookmarked ? (
                <Check className="h-4 w-4" />
              ) : (
                <BookmarkIcon className="h-4 w-4" />
              )}
              {bookmarked ? "Bookmarked" : "Bookmark"}
            </button>
          </div>
        )}

        {/* Inline Notes */}
        {showNotes && (
          <div className="mb-6 space-y-2">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Write your notes about this speaker..."
              className="w-full border rounded-md p-2 text-sm min-h-[80px] resize-y"
              aria-label="Speaker notes"
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

        {/* Inline Message */}
        {showMessage && (
          <div className="mb-6 space-y-2">
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
                  aria-label="Message to speaker"
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

        {/* Speaking at */}
        {speaker.sessions.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Speaking at
            </h3>
            <ul className="space-y-1.5">
              {speaker.sessions.map((session) => (
                <li key={session.id}>
                  <Link
                    href={`${basePath}/schedule/${session.id}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {session.title}
                  </Link>
                  {session.start_time && (
                    <span className="text-xs text-gray-500 ml-2">
                      {formatDateTime(session.start_time)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* About */}
        {speaker.bio && (
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">About</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {speaker.bio}
            </p>
          </div>
        )}
      </Card>
    </ModalOverlay>
  );
}

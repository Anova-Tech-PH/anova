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
  Globe,
  Phone,
  Mail,
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
    affiliations: { id: string; organization: string; role: string | null; start_date: string | null; end_date: string | null }[];
    education: { id: string; school: string; degree: string | null; field_of_study: string | null; start_year: number | null; end_year: number | null }[];
    links: { type: string; url: string; label?: string }[];
    phone: string | null;
    contact_email: string | null;
    address: string | null;
  };
  eventId: string;
  basePath: string;
  isBookmarked: boolean;
  noteContent?: string;
}

function LinkIcon({ type }: { type: string }) {
  switch (type) {
    case "linkedin": return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>;
    case "twitter": return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>;
    case "github": return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>;
    default: return <Globe className="h-4 w-4" />;
  }
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

        {/* Affiliations */}
        {profile.affiliations.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-foreground">Affiliations</h2>
            <div className="mt-2 space-y-2">
              {profile.affiliations.map((aff) => (
                <div key={aff.id}>
                  <p className="text-sm font-medium">{aff.organization}</p>
                  <p className="text-xs text-muted-foreground">
                    {[aff.role, aff.start_date && `${aff.start_date} — ${aff.end_date ?? "Present"}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {profile.education.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-foreground">Education</h2>
            <div className="mt-2 space-y-2">
              {profile.education.map((edu) => (
                <div key={edu.id}>
                  <p className="text-sm font-medium">{edu.school}</p>
                  <p className="text-xs text-muted-foreground">
                    {[
                      edu.degree && edu.field_of_study ? `${edu.degree} in ${edu.field_of_study}` : edu.degree || edu.field_of_study,
                      edu.start_year && `${edu.start_year} — ${edu.end_year ?? "Present"}`,
                    ].filter(Boolean).join(" · ")}
                  </p>
                </div>
              ))}
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

        {/* Contact */}
        {(profile.phone || profile.contact_email || profile.address) && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-foreground">Contact</h2>
            <div className="mt-2 space-y-1.5">
              {profile.phone && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  {profile.phone}
                </p>
              )}
              {profile.contact_email && (
                <a
                  href={`mailto:${profile.contact_email}`}
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  {profile.contact_email}
                </a>
              )}
              {profile.address && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {profile.address}
                </p>
              )}
            </div>
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

        {/* Links */}
        {profile.links.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-foreground">Links</h2>
            <div className="mt-2 space-y-1.5">
              {profile.links.map((link, i) => {
                let hostname = link.url;
                try { hostname = new URL(link.url).hostname; } catch {}
                return (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <LinkIcon type={link.type} />
                    {link.label || hostname}
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

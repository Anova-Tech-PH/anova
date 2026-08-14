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
} from "lucide-react";
import { Avatar, Badge, Button } from "@attendly/ui/components";
import { toggleAttendeeBookmark } from "@/features/attendee-profile/actions";

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
}

export function AttendeeProfileView({
  profile,
  eventId,
  basePath,
  isBookmarked: initialBookmarked,
}: AttendeeProfileViewProps) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [isPending, startTransition] = useTransition();

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
          <Button variant="ghost" size="sm">
            <MessageCircle className="mr-1.5 h-4 w-4" />
            Send Message
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

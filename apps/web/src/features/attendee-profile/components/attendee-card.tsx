"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Star, Eye, Hand } from "lucide-react";
import { Avatar, Button } from "@attendly/ui/components";
import { toggleAttendeeBookmark } from "@/features/attendee-profile/actions";

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
}

export function AttendeeCard({
  profile,
  eventId,
  basePath,
  isBookmarked: initialBookmarked,
}: AttendeeCardProps) {
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
          <h3 className="truncate text-sm font-semibold text-foreground">
            {profile.display_name}
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

      <div className="mt-3 flex gap-2">
        <Link
          href={`${basePath}/${profile.id}`}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-input bg-background px-3 py-1.5 text-xs font-medium shadow-sm transition-all hover:bg-accent hover:text-accent-foreground"
        >
          <Eye className="h-3.5 w-3.5" />
          View Profile
        </Link>
        <Button variant="ghost" size="sm" className="flex-1">
          <Hand className="mr-1.5 h-3.5 w-3.5" />
          Say Hi
        </Button>
      </div>
    </div>
  );
}

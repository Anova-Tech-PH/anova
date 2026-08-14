"use client";

import { useTransition } from "react";
import Link from "next/link";
import { MessageCircle, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { selectInterest, deselectInterest } from "@/features/matchmaking/actions";
import { Button } from "@attendly/ui/components";
import { Card } from "@attendly/ui/components";
import { Badge } from "@attendly/ui/components";
import { EmptyState } from "@attendly/ui/components";
import { cn } from "@attendly/ui/cn";
import type { EventInterest, MatchedAttendee } from "@/features/matchmaking/queries";

const INTEREST_COLORS = [
  "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
];

function getTagColor(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return INTEREST_COLORS[Math.abs(hash) % INTEREST_COLORS.length];
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface MatchmakingPageClientProps {
  eventId: string;
  orgSlug: string;
  eventSlug: string;
  interests: EventInterest[];
  matches: MatchedAttendee[];
}

export function MatchmakingPageClient({
  eventId,
  orgSlug,
  eventSlug,
  interests,
  matches,
}: MatchmakingPageClientProps) {
  const [isPending, startTransition] = useTransition();
  const selectedCount = interests.filter((i) => i.selected).length;

  function handleToggleInterest(interest: EventInterest) {
    startTransition(async () => {
      try {
        if (interest.selected) {
          await deselectInterest(eventId, interest.id, orgSlug, eventSlug);
        } else {
          await selectInterest(eventId, interest.id, orgSlug, eventSlug);
        }
      } catch (err) {
        toast.error("Failed to update interest. Please try again.");
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="h-6 w-1 rounded-full bg-primary" />
          <h1 className="text-2xl font-semibold">Matchmaking</h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Find people who share your interests and make meaningful connections.
        </p>
      </div>

      {/* Interest Selection */}
      <section className="rounded-xl border bg-card p-5">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Your Interests</h2>
          {selectedCount > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {selectedCount} selected
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Select your interests to find people like you
        </p>

        {interests.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No interests have been added to this event yet.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {interests.map((interest) => (
              <button
                key={interest.id}
                onClick={() => handleToggleInterest(interest)}
                disabled={isPending}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-200",
                  "border cursor-pointer select-none",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  interest.selected
                    ? "bg-primary text-primary-foreground border-primary shadow-sm hover:bg-primary/90"
                    : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground",
                  isPending && "opacity-60 pointer-events-none"
                )}
              >
                {interest.name}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Matches List */}
      {selectedCount > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="h-6 w-1 rounded-full bg-primary" />
            <h2 className="text-lg font-semibold">Your Matches</h2>
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {matches.length}
            </span>
          </div>

          {matches.length === 0 ? (
            <EmptyState title="No matches yet -- select more interests or check back as more attendees join!" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {matches.map((match) => (
                <Card
                  key={match.user_id}
                  className="flex flex-col gap-3 p-4 hover:shadow-md transition-shadow duration-200"
                >
                  {/* Profile header */}
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold ring-2 ring-background">
                      {match.avatar_url ? (
                        <img
                          src={match.avatar_url}
                          alt={match.full_name}
                          className="h-11 w-11 rounded-full object-cover"
                        />
                      ) : (
                        getInitials(match.full_name)
                      )}
                    </div>

                    {/* Name & details */}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-sm truncate">
                        {match.full_name}
                      </h3>
                      {(match.job_title || match.company) && (
                        <p className="text-xs text-muted-foreground truncate">
                          {[match.job_title, match.company]
                            .filter(Boolean)
                            .join(" at ")}
                        </p>
                      )}
                    </div>

                    {/* Match count badge */}
                    <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      <Users className="h-3 w-3" />
                      {match.shared_count}
                    </span>
                  </div>

                  {/* Shared interests */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-muted-foreground font-medium">
                      You both like: {match.shared_interests.join(", ")}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {match.shared_interests.map((interest) => (
                        <span
                          key={interest}
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                            getTagColor(interest)
                          )}
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Message button */}
                  <Link
                    href="/messages"
                    className="mt-auto"
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-1.5"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      Message
                    </Button>
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Prompt when no interests selected */}
      {selectedCount === 0 && interests.length > 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 px-6 py-12 text-center">
          <Users className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            Select your interests above to discover matching attendees
          </p>
        </div>
      )}
    </div>
  );
}

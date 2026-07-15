"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, UserPlus, Check, Clock, Users, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { sendConnectionRequest } from "@/features/connections/actions";
import { createConversation } from "@/features/messaging/actions";
import { Avatar } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/shared/utils/cn";

type Profile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  company: string | null;
  job_title: string | null;
  interests: string[];
  looking_for: string[];
};

type ConnectionMap = Record<string, { status: string; direction: "sent" | "received"; connectionId: string }>;

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

export function AttendeeDirectory({
  attendees,
  connectionMap,
  eventId,
  currentUserId,
}: {
  attendees: Profile[];
  connectionMap: ConnectionMap;
  eventId: string;
  currentUserId: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [connections, setConnections] = useState(connectionMap);

  function handleMessage(userId: string) {
    startTransition(async () => {
      try {
        const conv = await createConversation({
          event_id: eventId,
          is_group: false,
          member_ids: [userId],
        });
        router.push(`/messages?conversation=${conv.id}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to start conversation");
      }
    });
  }

  const filtered = useMemo(() => {
    if (!search) return attendees.filter((a) => a.id !== currentUserId);
    const q = search.toLowerCase();
    return attendees
      .filter((a) => a.id !== currentUserId)
      .filter(
        (a) =>
          a.full_name.toLowerCase().includes(q) ||
          a.company?.toLowerCase().includes(q) ||
          a.job_title?.toLowerCase().includes(q) ||
          a.interests?.some((i) => i.toLowerCase().includes(q))
      );
  }, [attendees, search, currentUserId]);

  function handleConnect(userId: string) {
    startTransition(async () => {
      try {
        await sendConnectionRequest(userId, eventId);
        setConnections((prev) => ({
          ...prev,
          [userId]: { status: "pending", direction: "sent", connectionId: "" },
        }));
        toast.success("Connection request sent");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to send request");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, company, or interests..."
          className="h-12 rounded-xl pl-12 text-base shadow-sm"
        />
      </div>

      {/* Attendee count */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>
          {filtered.length} attendee{filtered.length !== 1 ? "s" : ""} at this event
          {search && ` matching "${search}"`}
        </span>
      </div>

      {/* Grid or empty state */}
      {filtered.length === 0 ? (
        <EmptyState
          title={search ? "No attendees match your search" : "No other attendees yet"}
          description={
            search
              ? "Try adjusting your search terms or clearing the filter to see all attendees."
              : "Be the first to join! Other attendees will appear here as they register."
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((attendee) => {
            const conn = connections[attendee.id];
            return (
              <Card
                key={attendee.id}
                className="flex flex-col items-center p-6 text-center transition-shadow hover:shadow-md"
              >
                {/* Avatar */}
                <Avatar
                  src={attendee.avatar_url}
                  name={attendee.full_name}
                  size="xl"
                  className="mb-3"
                />

                {/* Name */}
                <p className="w-full truncate text-base font-semibold leading-tight">
                  {attendee.full_name}
                </p>

                {/* Title / Company */}
                {(attendee.job_title || attendee.company) && (
                  <p className="mt-0.5 w-full truncate text-sm text-muted-foreground">
                    {[attendee.job_title, attendee.company].filter(Boolean).join(" at ")}
                  </p>
                )}

                {/* Bio */}
                {attendee.bio && (
                  <p className="mt-2 w-full text-sm leading-relaxed text-muted-foreground line-clamp-2">
                    {attendee.bio}
                  </p>
                )}

                {/* Interest tags */}
                {attendee.interests && attendee.interests.length > 0 && (
                  <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                    {attendee.interests.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-medium",
                          getTagColor(tag)
                        )}
                      >
                        {tag}
                      </span>
                    ))}
                    {attendee.interests.length > 4 && (
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                        +{attendee.interests.length - 4}
                      </span>
                    )}
                  </div>
                )}

                {/* Connection action — pushed to the bottom */}
                <div className="mt-auto w-full pt-4 space-y-2">
                  {conn?.status === "accepted" ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled
                        className="w-full gap-1.5 text-emerald-600 dark:text-emerald-400"
                      >
                        <Check className="h-4 w-4" />
                        Connected
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMessage(attendee.id)}
                        disabled={isPending}
                        className="w-full gap-1.5"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Message
                      </Button>
                    </>
                  ) : conn?.status === "pending" ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className="w-full gap-1.5 text-muted-foreground"
                      >
                        <Clock className="h-4 w-4" />
                        Pending
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMessage(attendee.id)}
                        disabled={isPending}
                        className="w-full gap-1.5"
                      >
                        <MessageCircle className="h-4 w-4" />
                        Message
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleConnect(attendee.id)}
                      disabled={isPending}
                      className="w-full gap-1.5"
                    >
                      <UserPlus className="h-4 w-4" />
                      Connect
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

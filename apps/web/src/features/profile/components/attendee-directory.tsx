"use client";

import { useState, useMemo, useTransition } from "react";
import { Search, User, UserPlus, Check, Clock } from "lucide-react";
import { toast } from "sonner";
import { sendConnectionRequest } from "@/features/connections/actions";
import { Avatar } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { EmptyState } from "@/shared/components/ui/empty-state";
import { Input } from "@/shared/components/ui/input";

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
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const [connections, setConnections] = useState(connectionMap);

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
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, company, or interests..."
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={search ? "No attendees match your search" : "No other attendees yet"}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((attendee) => {
            const conn = connections[attendee.id];
            return (
              <Card key={attendee.id} className="flex gap-3 p-4">
                <Avatar src={attendee.avatar_url} name={attendee.full_name} size="lg" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{attendee.full_name}</p>
                  {(attendee.job_title || attendee.company) && (
                    <p className="text-xs text-muted-foreground truncate">
                      {[attendee.job_title, attendee.company].filter(Boolean).join(" at ")}
                    </p>
                  )}
                  {attendee.bio && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{attendee.bio}</p>
                  )}
                  {attendee.interests && attendee.interests.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {attendee.interests.slice(0, 3).map((tag) => (
                        <span key={tag} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          {tag}
                        </span>
                      ))}
                      {attendee.interests.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{attendee.interests.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="shrink-0">
                  {conn?.status === "accepted" ? (
                    <Badge variant="success" className="flex items-center gap-1">
                      <Check className="h-3 w-3" /> Connected
                    </Badge>
                  ) : conn?.status === "pending" ? (
                    <Badge variant="warning" className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Pending
                    </Badge>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleConnect(attendee.id)}
                      disabled={isPending}
                      className="flex items-center gap-1 rounded-full text-[10px]"
                    >
                      <UserPlus className="h-3 w-3" /> Connect
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {filtered.length} attendee{filtered.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

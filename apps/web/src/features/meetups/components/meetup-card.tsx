"use client";

import { useTransition } from "react";
import { CalendarDays, MapPin, Users, Bell, Pencil, Trash2 } from "lucide-react";
import { Button, useConfirm } from "@attendly/ui/components";
import { deleteMeetup } from "@/features/meetups/actions";
import type { Meetup } from "@/features/meetups/queries";
import { toast } from "sonner";

function formatMeetupDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
}

function formatMeetupTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

interface MeetupCardProps {
  meetup: Meetup;
  eventId: string;
  onEdit: (meetup: Meetup) => void;
}

export function MeetupCard({ meetup, eventId, onEdit }: MeetupCardProps) {
  const [isPending, startTransition] = useTransition();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const rsvpCount = meetup.rsvp_count ?? 0;

  async function handleDelete() {
    const ok = await confirm({
      title: "Delete Meet-up",
      description:
        "Are you sure you want to delete this meet-up? This action cannot be undone.",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await deleteMeetup(eventId, meetup.id);
        toast.success("Meet-up deleted");
      } catch {
        toast.error("Failed to delete meet-up");
      }
    });
  }

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <h4 className="text-base font-semibold">{meetup.title}</h4>

      {meetup.description && (
        <div>
          <span className="text-xs font-medium text-muted-foreground">Description</span>
          <p className="mt-0.5 text-sm text-foreground/80">{meetup.description}</p>
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CalendarDays className="h-4 w-4" />
        <span>{formatMeetupDate(meetup.starts_at)}</span>
        <span>{formatMeetupTime(meetup.starts_at)}</span>
        {meetup.ends_at && (
          <>
            <span>-</span>
            <span>{formatMeetupTime(meetup.ends_at)}</span>
          </>
        )}
      </div>

      {meetup.location && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>{meetup.location}</span>
        </div>
      )}

      <div className="flex items-center gap-2 text-sm">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{rsvpCount} attending</span>
        {meetup.capacity && (
          <span className="text-muted-foreground">
            ({rsvpCount} / {meetup.capacity})
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => toast.success("Coming soon")}
          aria-label="Send/Schedule Notifications"
        >
          <Bell className="mr-1.5 h-3.5 w-3.5" />
          Send/Schedule Notifications
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(meetup)}
          aria-label="Edit"
        >
          <Pencil className="mr-1.5 h-3.5 w-3.5" />
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          disabled={isPending}
          className="text-destructive hover:text-destructive"
          aria-label="Delete"
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Delete
        </Button>
      </div>

      {confirmDialog}
    </div>
  );
}

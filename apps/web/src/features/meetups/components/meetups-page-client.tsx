"use client";

import { useState } from "react";
import { Plus, Globe, Users } from "lucide-react";
import { Button, Card, CardContent } from "@attendly/ui/components";
import type { Meetup } from "@/features/meetups/queries";
import { MeetupComposer } from "./meetup-composer";
import { MeetupCard } from "./meetup-card";

interface MeetupsPageClientProps {
  eventId: string;
  meetups: Meetup[];
  total: number;
  page: number;
  pageSize: number;
}

export function MeetupsPageClient({
  eventId,
  meetups,
  total,
  page,
  pageSize,
}: MeetupsPageClientProps) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<Meetup | null>(null);

  function openComposerEmpty() {
    setEditDraft(null);
    setComposerOpen(true);
  }

  function handleEdit(meetup: Meetup) {
    setEditDraft(meetup);
    setComposerOpen(true);
  }

  function handleComposerClose() {
    setComposerOpen(false);
    setEditDraft(null);
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Meet-ups</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          What, when, where? Post your meet-ups on the Community Board and get
          your attendees engaged.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{total}</p>
              <p className="text-xs text-muted-foreground">Meet-ups</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={openComposerEmpty}>
          <Plus className="mr-2 h-4 w-4" />
          Create meet-up
        </Button>
        <Button
          variant="outline"
          disabled
          title="Coming soon"
        >
          <Globe className="mr-2 h-4 w-4" />
          From other organizers
        </Button>
      </div>

      {meetups.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 py-12 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm text-muted-foreground">
            No meet-ups yet. Create one to get your attendees engaged!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {meetups.map((meetup) => (
            <MeetupCard
              key={meetup.id}
              meetup={meetup}
              eventId={eventId}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      <MeetupComposer
        eventId={eventId}
        open={composerOpen}
        onClose={handleComposerClose}
        draft={editDraft}
      />
    </div>
  );
}

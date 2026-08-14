"use client";

import { useState, useTransition } from "react";
import {
  Plus,
  Sparkles,
  Hash,
  Users,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button, Card, CardContent, useConfirm } from "@attendly/ui/components";
import type { EventInterest } from "@/features/matchmaking/queries";
import { deleteInterest } from "@/features/matchmaking/actions";
import { InterestComposer } from "./interest-composer";
import { toast } from "sonner";

interface MatchmakingPageClientProps {
  eventId: string;
  interests: EventInterest[];
  total: number;
  attendeesParticipating: number;
}

export function MatchmakingPageClient({
  eventId,
  interests,
  total,
  attendeesParticipating,
}: MatchmakingPageClientProps) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const { confirm, dialog: confirmDialog } = useConfirm();

  function openComposerEmpty() {
    setEditDraft(null);
    setComposerOpen(true);
  }

  function handleEdit(interest: EventInterest) {
    setEditDraft({ id: interest.id, name: interest.name });
    setComposerOpen(true);
  }

  function handleComposerClose() {
    setComposerOpen(false);
    setEditDraft(null);
  }

  async function handleDelete(interest: EventInterest) {
    const ok = await confirm({
      title: "Delete Interest",
      description:
        "Are you sure you want to delete this interest? This action cannot be undone.",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await deleteInterest(eventId, interest.id);
        toast.success("Interest deleted");
      } catch {
        toast.error("Failed to delete interest");
      }
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Attendee Matchmaking</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Define interests to help attendees discover others with similar
          passions and connect at your event.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Hash className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{total}</p>
              <p className="text-xs text-muted-foreground">
                Interests Defined
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{attendeesParticipating}</p>
              <p className="text-xs text-muted-foreground">
                Attendees Participating
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" disabled title="Coming soon">
          <Sparkles className="mr-2 h-4 w-4" />
          Generate interests
        </Button>
        <Button onClick={openComposerEmpty}>
          <Plus className="mr-2 h-4 w-4" />
          Add interest
        </Button>
      </div>

      <div className="space-y-4">
        {interests.length === 0 ? (
          <div className="rounded-xl border border-dashed bg-muted/20 py-12 text-center">
            <Hash className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              Define interests to help attendees find others with similar
              passions!
            </p>
          </div>
        ) : (
          <div className="rounded-xl border">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Interest</th>
                  <th className="px-4 py-3 font-medium">Attendees</th>
                  <th className="px-4 py-3 text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {interests.map((interest) => (
                  <tr key={interest.id} className="border-b last:border-0">
                    <td className="px-4 py-3 text-sm font-medium">
                      {interest.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {interest.attendee_count} attendees
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(interest)}
                          aria-label="Edit"
                        >
                          <Pencil className="mr-1.5 h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(interest)}
                          disabled={isPending}
                          className="text-destructive hover:text-destructive"
                          aria-label="Delete"
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          {isPending ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <InterestComposer
        eventId={eventId}
        open={composerOpen}
        onClose={handleComposerClose}
        draft={editDraft}
      />

      {confirmDialog}
    </div>
  );
}

"use client";

import { useTransition } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
} from "@attendly/ui/components";
import { Rocket, Loader2 } from "lucide-react";
import { publishEvent, unpublishEvent } from "../actions";
import type { ReadinessCheck } from "../queries";

export function PublishButton({
  eventId,
  eventTitle,
  canPublish,
  warnings,
}: {
  eventId: string;
  eventTitle: string;
  canPublish: boolean;
  warnings: ReadinessCheck[];
}) {
  const [isPending, startTransition] = useTransition();

  const handlePublish = () => {
    startTransition(async () => {
      await publishEvent(eventId);
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="lg" disabled={!canPublish || isPending} className="gap-2">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
          Publish Event
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Publish Event?</AlertDialogTitle>
          <AlertDialogDescription>
            This will make <strong>{eventTitle}</strong> publicly visible.
            Attendees will be able to view the event and register.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {warnings.length > 0 && (
          <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800 space-y-1">
            <p className="font-medium">Heads up:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              {warnings.map((w) => (
                <li key={w.id}>{w.name} is not configured</li>
              ))}
            </ul>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handlePublish} disabled={isPending}>
            {isPending ? "Publishing..." : "Publish Event"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function UnpublishButton({ eventId }: { eventId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleUnpublish = () => {
    startTransition(async () => {
      await unpublishEvent(eventId);
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
          disabled={isPending}
        >
          {isPending ? "Unpublishing..." : "Unpublish Event"}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unpublish Event?</AlertDialogTitle>
          <AlertDialogDescription>
            This will revert your event to draft. It will no longer be publicly
            visible and attendees won&apos;t be able to register.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleUnpublish} disabled={isPending}>
            {isPending ? "Unpublishing..." : "Unpublish"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

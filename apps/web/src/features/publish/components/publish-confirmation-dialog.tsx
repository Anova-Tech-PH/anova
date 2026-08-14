"use client";

import { useTransition } from "react";
import { Button, useConfirm } from "@attendly/ui/components";
import { Rocket, Loader2 } from "lucide-react";
import { toast } from "sonner";
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
  const { confirm, dialog } = useConfirm();

  const handleClick = async () => {
    const warningText = warnings.length > 0
      ? `\n\nNote: ${warnings.map((w) => w.name).join(", ")} not yet configured.`
      : "";

    const ok = await confirm({
      title: "Publish Event?",
      description: `This will make "${eventTitle}" publicly visible. Attendees will be able to view the event and register.${warningText}`,
      confirmLabel: "Publish Event",
      variant: "primary",
    });

    if (ok) {
      startTransition(async () => {
        try {
          await publishEvent(eventId);
          toast.success("Event published successfully");
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to publish event");
        }
      });
    }
  };

  const button = (
    <Button size="lg" disabled={!canPublish || isPending} className="gap-2" onClick={handleClick}>
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
      {isPending ? "Publishing..." : "Publish Event"}
    </Button>
  );

  return (
    <>
      {dialog}
      {!canPublish ? (
        <div title="Complete all required checks before publishing">
          {button}
        </div>
      ) : (
        button
      )}
    </>
  );
}

export function UnpublishButton({ eventId }: { eventId: string }) {
  const [isPending, startTransition] = useTransition();
  const { confirm, dialog } = useConfirm();

  const handleClick = async () => {
    const ok = await confirm({
      title: "Unpublish Event?",
      description:
        "This will revert your event to draft. It will no longer be publicly visible and attendees won't be able to register.",
      confirmLabel: "Unpublish",
      variant: "destructive",
    });

    if (ok) {
      startTransition(async () => {
        try {
          await unpublishEvent(eventId);
          toast.success("Event unpublished");
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to unpublish event");
        }
      });
    }
  };

  return (
    <>
      {dialog}
      <button
        className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
        disabled={isPending}
        onClick={handleClick}
      >
        {isPending ? "Unpublishing..." : "Unpublish Event"}
      </button>
    </>
  );
}

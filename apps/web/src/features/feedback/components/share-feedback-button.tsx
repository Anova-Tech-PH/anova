"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { shareFeedbackWithSpeakers } from "@/features/feedback/actions";

export function ShareFeedbackButton({
  eventId,
  sessionId,
  sessionTitle,
}: {
  eventId: string;
  sessionId: string;
  sessionTitle: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleShare() {
    startTransition(async () => {
      try {
        const { emailsSent } = await shareFeedbackWithSpeakers(
          eventId,
          sessionId,
          sessionTitle
        );
        if (emailsSent === 0) {
          toast.info("No speakers with email addresses found for this session.");
        } else {
          toast.success(
            `Feedback shared with ${emailsSent} speaker${emailsSent === 1 ? "" : "s"}.`
          );
        }
      } catch {
        toast.error("Failed to share feedback with speakers.");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={isPending}
      className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted/50 disabled:opacity-50"
      title={`Share feedback for "${sessionTitle}" with speakers`}
    >
      {isPending ? "Sending..." : "Share with speakers"}
    </button>
  );
}

"use client";

import { useState } from "react";
import { toast } from "sonner";
import { rsvpToSession, cancelRsvp } from "@/features/rsvp/actions";

export function RsvpButton({
  sessionId,
  initialStatus,
  confirmedCount,
  capacity,
  rsvpEnabled,
}: {
  sessionId: string;
  initialStatus: string | null;
  confirmedCount: number;
  capacity: number | null;
  rsvpEnabled: boolean;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [count, setCount] = useState(confirmedCount);
  const [loading, setLoading] = useState(false);

  if (!rsvpEnabled) return null;

  const isFull = capacity !== null && count >= capacity;

  async function handleRsvp() {
    setLoading(true);
    try {
      const result = await rsvpToSession(sessionId);
      setStatus(result);
      if (result === "confirmed") {
        setCount((c) => c + 1);
        toast.success("RSVP confirmed!");
      } else {
        toast.success("Added to waitlist");
      }
    } catch {
      toast.error("Sign in to RSVP");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    setLoading(true);
    try {
      await cancelRsvp(sessionId);
      if (status === "confirmed") {
        setCount((c) => Math.max(0, c - 1));
      }
      setStatus(null);
      toast.success("RSVP cancelled");
    } catch {
      toast.error("Sign in to cancel RSVP");
    } finally {
      setLoading(false);
    }
  }

  const countLabel = capacity ? `${count}/${capacity} attending` : `${count} attending`;

  let buttonLabel: string;
  let buttonAction: () => void;
  let buttonStyle: string;

  if (status === "confirmed") {
    buttonLabel = "Cancel RSVP";
    buttonAction = handleCancel;
    buttonStyle = "border-red-200 text-red-600 hover:bg-red-50";
  } else if (status === "waitlisted") {
    buttonLabel = "On Waitlist";
    buttonAction = handleCancel;
    buttonStyle = "border-amber-200 text-amber-600 hover:bg-amber-50";
  } else if (isFull) {
    buttonLabel = "Join Waitlist";
    buttonAction = handleRsvp;
    buttonStyle = "border-amber-200 text-amber-700 hover:bg-amber-50";
  } else {
    buttonLabel = "RSVP";
    buttonAction = handleRsvp;
    buttonStyle = "border-primary/30 text-primary hover:bg-primary/5";
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={buttonAction}
        disabled={loading}
        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${buttonStyle}`}
      >
        {loading ? "..." : buttonLabel}
      </button>
      <span className="text-xs text-muted-foreground">{countLabel}</span>
    </div>
  );
}

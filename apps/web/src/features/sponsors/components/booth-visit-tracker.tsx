"use client";

import { useEffect } from "react";
import { recordBoothVisit } from "@/features/sponsors/actions";

type BoothVisitTrackerProps = {
  sponsorId: string;
  eventId: string;
};

export function BoothVisitTracker({ sponsorId, eventId }: BoothVisitTrackerProps) {
  useEffect(() => {
    recordBoothVisit(sponsorId, eventId).catch(() => {
      // Fire-and-forget — ignore errors (e.g., unauthenticated users)
    });
  }, [sponsorId, eventId]);

  return null;
}

"use client";

import { useState, useEffect } from "react";
import { MapPin, Clock, ArrowUpRight } from "lucide-react";

interface EventHeaderBarProps {
  event: {
    title: string;
    start_date: string;
    end_date: string;
    venue_name: string | null;
    timezone: string | null;
    is_virtual: boolean;
  };
}

export function EventHeaderBar({ event }: EventHeaderBarProps) {
  const [useLocalTime, setUseLocalTime] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("attendly-timezone-pref");
    if (saved === "event") setUseLocalTime(false);
  }, []);

  function toggleTimezone() {
    const next = !useLocalTime;
    setUseLocalTime(next);
    localStorage.setItem("attendly-timezone-pref", next ? "local" : "event");
  }

  const startDate = new Date(event.start_date);
  const endDate = new Date(event.end_date);
  const dateStr =
    startDate.toDateString() === endDate.toDateString()
      ? startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  const mapUrl = event.venue_name
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue_name)}`
    : null;

  return (
    <div className="sticky top-0 z-30 hidden lg:flex items-center gap-4 border-b bg-primary px-4 py-2 text-primary-foreground text-sm">
      <span className="font-semibold truncate max-w-[300px]">{event.title}</span>
      <span className="text-primary-foreground/70">|</span>

      {event.venue_name && !event.is_virtual && (
        <>
          {mapUrl ? (
            <a
              href={mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:underline"
            >
              <MapPin className="h-3.5 w-3.5" />
              {event.venue_name}
              <ArrowUpRight className="h-3 w-3" />
            </a>
          ) : (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {event.venue_name}
            </span>
          )}
          <span className="text-primary-foreground/70">|</span>
        </>
      )}

      <span>{dateStr}</span>

      {event.timezone && (
        <>
          <span className="text-primary-foreground/70">|</span>
          <button
            onClick={toggleTimezone}
            className="flex items-center gap-1 rounded px-2 py-0.5 hover:bg-primary-foreground/10 transition-colors"
          >
            <Clock className="h-3.5 w-3.5" />
            {useLocalTime ? "Switch to event time" : "Switch to local time"}
          </button>
        </>
      )}
    </div>
  );
}

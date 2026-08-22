import React, { createContext, useContext, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMyEvents } from "@attendly/supabase-client";
import { supabase } from "./supabase";
import { useAuth } from "./auth-context";

interface EventData {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  start_date: string;
  end_date: string;
  venue_name: string | null;
  is_virtual: boolean;
  cover_image: string | null;
  status: string;
  organizations: { slug: string; name: string } | null;
}

interface Registration {
  id: string;
  status: string;
  qr_code: string | null;
  created_at: string;
  events: EventData | null;
  ticket_types: { name: string } | null;
}

interface EventContextValue {
  currentEvent: EventData | null;
  events: Registration[];
  setCurrentEvent: (event: EventData) => void;
  isLoading: boolean;
}

const EventContext = createContext<EventContextValue | undefined>(undefined);

export function EventProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [currentEvent, setCurrentEventState] = useState<EventData | null>(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["my-events", user?.id],
    queryFn: () => getMyEvents(supabase, user!.id),
    enabled: !!user?.id,
    select: (data) => {
      // Auto-select first event if none selected
      if (!currentEvent && data.length > 0) {
        const firstEvent = (data[0] as Registration).events;
        if (firstEvent) {
          setCurrentEventState(firstEvent);
        }
      }
      return data as Registration[];
    },
  });

  const setCurrentEvent = useCallback((event: EventData) => {
    setCurrentEventState(event);
  }, []);

  return (
    <EventContext.Provider
      value={{
        currentEvent,
        events,
        setCurrentEvent,
        isLoading,
      }}
    >
      {children}
    </EventContext.Provider>
  );
}

export function useEventContext() {
  const context = useContext(EventContext);
  if (context === undefined) {
    throw new Error("useEventContext must be used within an EventProvider");
  }
  return context;
}

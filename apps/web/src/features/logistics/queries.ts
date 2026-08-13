import { createClient } from "@attendly/ui/supabase/server";

export interface Hotel {
  name: string;
  url?: string;
  distance?: string;
  rate?: string;
}

export interface Contact {
  name: string;
  phone?: string;
  email?: string;
}

export interface CustomSection {
  title: string;
  body: string;
}

export interface LogisticsData {
  parking?: { title: string; body: string };
  transportation?: { title: string; body: string };
  wifi?: { network: string; password: string };
  hotels?: Hotel[];
  contacts?: Contact[];
  custom_sections?: CustomSection[];
}

export interface EventLogistics {
  venue_description: string;
  venue_map_url: string;
  logistics: LogisticsData;
}

export async function getEventLogistics(eventId: string): Promise<EventLogistics> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select("venue_description, venue_map_url, logistics")
    .eq("id", eventId)
    .single();

  if (error) throw new Error(error.message);

  return {
    venue_description: data.venue_description ?? "",
    venue_map_url: data.venue_map_url ?? "",
    logistics: {
      parking: data.logistics?.parking ?? { title: "", body: "" },
      transportation: data.logistics?.transportation ?? { title: "", body: "" },
      wifi: data.logistics?.wifi ?? { network: "", password: "" },
      hotels: data.logistics?.hotels ?? [],
      contacts: data.logistics?.contacts ?? [],
      custom_sections: data.logistics?.custom_sections ?? [],
    },
  };
}

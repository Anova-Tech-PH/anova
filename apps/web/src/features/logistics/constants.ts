export interface LogisticsItem {
  id: string;
  event_id: string;
  template: "welcome" | "venue" | "parking" | "hotel" | "travel_info" | "floor_map" | "custom";
  title: string;
  content: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const TEMPLATES = [
  { value: "welcome", label: "Welcome" },
  { value: "venue", label: "Venue" },
  { value: "floor_map", label: "Floor Map" },
  { value: "travel_info", label: "Travel Info" },
  { value: "parking", label: "Parking" },
  { value: "hotel", label: "Hotel" },
  { value: "custom", label: "Custom" },
] as const;

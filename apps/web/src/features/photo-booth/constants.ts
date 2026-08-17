export interface BoothFrame {
  id: string;
  event_id: string;
  message: string;
  color: string;
  template: "banner_top" | "banner_bottom" | "corner" | "border";
  sort_order: number;
  created_at: string;
}

export const FRAME_TEMPLATES = [
  { value: "banner_top", label: "Banner Top" },
  { value: "banner_bottom", label: "Banner Bottom" },
  { value: "corner", label: "Corner Badge" },
  { value: "border", label: "Full Border" },
] as const;

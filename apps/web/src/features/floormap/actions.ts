"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function createFloormap(eventId: string, formData: FormData) {
  const supabase = await createClient();
  const file = formData.get("image") as File;
  const name = (formData.get("name") as string) || "Floor Map";

  if (!file || file.size === 0) throw new Error("Image file is required");
  if (!file.type.startsWith("image/")) throw new Error("File must be an image");
  if (file.size > 10 * 1024 * 1024) throw new Error("Image must be under 10MB");

  const ext = file.name.split(".").pop() ?? "png";
  const path = `${eventId}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("floormap-images")
    .upload(path, file);
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from("floormap-images")
    .getPublicUrl(path);

  const { count } = await supabase
    .from("floormaps")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);

  const { error } = await supabase.from("floormaps").insert({
    event_id: eventId,
    name,
    image_url: urlData.publicUrl,
    display_order: count ?? 0,
  });

  if (error) throw error;
  revalidatePath(`/events/${eventId}/floormap`);
}

export async function updateFloormap(
  floormapId: string,
  eventId: string,
  data: { name?: string; display_order?: number }
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("floormaps")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", floormapId);

  if (error) throw error;
  revalidatePath(`/events/${eventId}/floormap`);
}

export async function deleteFloormap(floormapId: string, eventId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("floormaps")
    .delete()
    .eq("id", floormapId);

  if (error) throw error;
  revalidatePath(`/events/${eventId}/floormap`);
}

export async function upsertMarker(
  floormapId: string,
  eventId: string,
  marker: { id?: string; label: string; x: number; y: number }
) {
  const supabase = await createClient();

  if (marker.id) {
    const { error } = await supabase
      .from("floormap_markers")
      .update({ label: marker.label, x: marker.x, y: marker.y })
      .eq("id", marker.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("floormap_markers").insert({
      floormap_id: floormapId,
      label: marker.label,
      x: marker.x,
      y: marker.y,
    });
    if (error) throw error;
  }

  revalidatePath(`/events/${eventId}/floormap`);
}

export async function deleteMarker(markerId: string, eventId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("floormap_markers")
    .delete()
    .eq("id", markerId);

  if (error) throw error;
  revalidatePath(`/events/${eventId}/floormap`);
}

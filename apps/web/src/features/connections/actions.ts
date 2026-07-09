"use server";

import { createClient } from "@/shared/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function sendConnectionRequest(receiverId: string, eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("connections")
    .insert({
      requester_id: user.id,
      receiver_id: receiverId,
      event_id: eventId,
      status: "pending",
    });

  if (error) {
    if (error.code === "23505") throw new Error("Connection request already sent");
    throw new Error(error.message);
  }

  revalidatePath("/people");
}

export async function respondToConnection(connectionId: string, status: "accepted" | "declined") {
  const supabase = await createClient();

  const { error } = await supabase
    .from("connections")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", connectionId);

  if (error) throw new Error(error.message);
  revalidatePath("/people");
}

export async function getConnectionsForEvent(eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { sent: [], received: [] };

  const { data: sent } = await supabase
    .from("connections")
    .select("id, receiver_id, status")
    .eq("requester_id", user.id)
    .eq("event_id", eventId);

  const { data: received } = await supabase
    .from("connections")
    .select("id, requester_id, status")
    .eq("receiver_id", user.id)
    .eq("event_id", eventId);

  return { sent: sent ?? [], received: received ?? [] };
}

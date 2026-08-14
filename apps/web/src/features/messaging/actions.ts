"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function sendMessage(
  eventId: string,
  recipientId: string,
  content: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  if (!content.trim()) throw new Error("Message cannot be empty");

  const { error } = await supabase.from("direct_messages").insert({
    event_id: eventId,
    sender_id: user.id,
    recipient_id: recipientId,
    content: content.trim(),
  });
  if (error) throw error;
  revalidatePath("/");
}

export async function markMessagesRead(eventId: string, otherUserId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await supabase
    .from("direct_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("event_id", eventId)
    .eq("sender_id", otherUserId)
    .eq("recipient_id", user.id)
    .is("read_at", null);

  revalidatePath("/");
}

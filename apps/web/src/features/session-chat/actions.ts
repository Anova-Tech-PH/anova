"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function sendChatMessage(sessionId: string, content: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const trimmed = content.trim();
  if (!trimmed) throw new Error("Message cannot be empty");
  if (trimmed.length > 2000) throw new Error("Message too long (max 2000 characters)");

  const { data, error } = await supabase
    .from("session_chat_messages")
    .insert({
      session_id: sessionId,
      user_id: user.id,
      content: trimmed,
    })
    .select("id, content, created_at")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/");
  return data;
}

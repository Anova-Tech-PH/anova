"use server";

import { createClient } from "@/shared/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function createConversation(data: {
  event_id: string;
  is_group: boolean;
  name?: string;
  member_ids: string[];
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // For DMs, use the RPC function which handles deduplication and RLS
  if (!data.is_group && data.member_ids.length === 1) {
    const { data: convId, error } = await supabase.rpc("create_dm_conversation", {
      p_event_id: data.event_id,
      p_other_user_id: data.member_ids[0],
    });

    if (error) throw new Error(error.message);

    revalidatePath("/messages");
    return { id: convId as string };
  }

  // Group conversations (future use)
  const { data: convId, error } = await supabase.rpc("create_dm_conversation", {
    p_event_id: data.event_id,
    p_other_user_id: data.member_ids[0],
  });

  if (error) throw new Error(error.message);

  revalidatePath("/messages");
  return { id: convId as string };
}

export async function sendMessage(data: {
  conversation_id: string;
  content: string;
  image_url?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: message, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: data.conversation_id,
      sender_id: user.id,
      content: data.content,
      image_url: data.image_url || null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .single();

  // Update conversation timestamp
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", data.conversation_id);

  // Update last_read_at for sender
  await supabase
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", data.conversation_id)
    .eq("user_id", user.id);

  return { ...message, profiles: profile };
}

export async function markConversationRead(conversationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id);
}

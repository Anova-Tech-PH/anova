"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";
import {
  sendMessageMutation,
  markConversationReadMutation,
  createDmConversationMutation,
} from "@attendly/supabase-client/mutations/messaging";

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
    const result = await createDmConversationMutation(supabase, data.event_id, data.member_ids[0]);
    revalidatePath("/messages");
    return result;
  }

  // Group conversations (future use)
  const result = await createDmConversationMutation(supabase, data.event_id, data.member_ids[0]);
  revalidatePath("/messages");
  return result;
}

export async function sendMessage(data: {
  conversation_id: string;
  content: string;
  image_url?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  return sendMessageMutation(supabase, user.id, data);
}

export async function markConversationRead(conversationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await markConversationReadMutation(supabase, conversationId, user.id);
}

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

  // For DMs, check if conversation already exists
  if (!data.is_group && data.member_ids.length === 1) {
    const otherUserId = data.member_ids[0];

    const { data: existing } = await supabase
      .from("conversations")
      .select(`
        id,
        conversation_members!inner(user_id)
      `)
      .eq("event_id", data.event_id)
      .eq("is_group", false);

    // Find a conversation where both users are members
    if (existing) {
      for (const conv of existing) {
        const memberIds = (conv.conversation_members as any[]).map((m: any) => m.user_id);
        if (memberIds.includes(user.id) && memberIds.includes(otherUserId)) {
          return conv;
        }
      }
    }
  }

  const { data: conversation, error } = await supabase
    .from("conversations")
    .insert({
      event_id: data.event_id,
      is_group: data.is_group,
      name: data.name || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Add all members including self
  const allMemberIds = [...new Set([user.id, ...data.member_ids])];
  const { error: membersError } = await supabase
    .from("conversation_members")
    .insert(
      allMemberIds.map((uid) => ({
        conversation_id: conversation.id,
        user_id: uid,
      }))
    );

  if (membersError) throw new Error(membersError.message);

  revalidatePath("/messages");
  return conversation;
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

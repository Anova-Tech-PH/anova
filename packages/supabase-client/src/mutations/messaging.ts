import { SupabaseClient } from "@supabase/supabase-js";

export async function sendMessageMutation(
  client: SupabaseClient,
  userId: string,
  data: {
    conversation_id: string;
    content: string;
    image_url?: string;
  }
) {
  const { data: message, error } = await client
    .from("messages")
    .insert({
      conversation_id: data.conversation_id,
      sender_id: userId,
      content: data.content,
      image_url: data.image_url || null,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  const { data: profile } = await client
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", userId)
    .single();

  // Update conversation timestamp
  await client
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", data.conversation_id);

  // Update last_read_at for sender
  await client
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", data.conversation_id)
    .eq("user_id", userId);

  return { ...message, profiles: profile };
}

export async function markConversationReadMutation(
  client: SupabaseClient,
  conversationId: string,
  userId: string
) {
  await client
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
}

export async function createDmConversationMutation(
  client: SupabaseClient,
  eventId: string,
  otherUserId: string
) {
  const { data: convId, error } = await client.rpc("create_dm_conversation", {
    p_event_id: eventId,
    p_other_user_id: otherUserId,
  });

  if (error) throw new Error(error.message);

  return { id: convId as string };
}

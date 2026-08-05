import { createClient } from "@attendly/ui/supabase/server";
import {
  getConversations as getConversationsQuery,
  getMessages as getMessagesQuery,
} from "@attendly/supabase-client/queries/messaging";

export async function getConversations() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  return getConversationsQuery(supabase, user.id);
}

export async function getMessages(conversationId: string) {
  const supabase = await createClient();

  return getMessagesQuery(supabase, conversationId);
}

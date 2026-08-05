import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";

export function subscribeToMessages(
  client: SupabaseClient,
  conversationId: string,
  onMessage: (message: any) => void
): RealtimeChannel {
  return client
    .channel(`messages:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onMessage(payload.new)
    )
    .subscribe();
}

export function unsubscribeFromMessages(client: SupabaseClient, channel: RealtimeChannel) {
  client.removeChannel(channel);
}

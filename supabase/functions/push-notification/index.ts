import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface WebhookPayload {
  type: "INSERT" | "UPDATE";
  table: string;
  record: Record<string, any>;
  old_record: Record<string, any> | null;
}

Deno.serve(async (req) => {
  const payload: WebhookPayload = await req.json();
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let targetUserIds: string[] = [];
  let title = "";
  let body = "";
  let data: Record<string, string> = {};

  // Determine notification based on table
  if (payload.table === "connections" && payload.type === "INSERT") {
    targetUserIds = [payload.record.receiver_id];
    const { data: requester } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", payload.record.requester_id)
      .single();

    title = "New Connection Request";
    body = `${requester?.full_name ?? "Someone"} wants to connect with you`;
    data = { type: "connection", connectionId: payload.record.id };
  } else if (payload.table === "connections" && payload.type === "UPDATE" && payload.record.status === "accepted") {
    targetUserIds = [payload.record.requester_id];
    const { data: accepter } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", payload.record.receiver_id)
      .single();

    title = "Connection Accepted";
    body = `${accepter?.full_name ?? "Someone"} accepted your connection request`;
    data = { type: "connection_accepted", connectionId: payload.record.id };
  } else if (payload.table === "messages" && payload.type === "INSERT") {
    const { data: members } = await supabase
      .from("conversation_members")
      .select("user_id")
      .eq("conversation_id", payload.record.conversation_id)
      .neq("user_id", payload.record.sender_id);

    targetUserIds = members?.map((m) => m.user_id) ?? [];

    const { data: sender } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", payload.record.sender_id)
      .single();

    title = sender?.full_name ?? "New Message";
    body = payload.record.content.substring(0, 100);
    data = { type: "message", conversationId: payload.record.conversation_id };
  } else {
    return new Response(JSON.stringify({ skipped: true }), { status: 200 });
  }

  if (targetUserIds.length === 0) {
    return new Response(JSON.stringify({ skipped: true, reason: "no targets" }), { status: 200 });
  }

  // Fetch push tokens for target users
  const { data: tokens } = await supabase
    .from("push_tokens")
    .select("expo_push_token")
    .in("user_id", targetUserIds);

  if (!tokens || tokens.length === 0) {
    return new Response(JSON.stringify({ skipped: true, reason: "no tokens" }), { status: 200 });
  }

  // Send via Expo Push API
  const messages = tokens.map((t) => ({
    to: t.expo_push_token,
    sound: "default",
    title,
    body,
    data,
  }));

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(messages),
  });

  const result = await response.json();
  return new Response(JSON.stringify({ sent: messages.length, result }), { status: 200 });
});

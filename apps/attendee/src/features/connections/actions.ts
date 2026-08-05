"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";
import {
  sendConnectionRequestMutation,
  respondToConnectionMutation,
} from "@attendly/supabase-client/mutations/connections";
import { getConnectionsForEvent as _getConnectionsForEvent } from "@attendly/supabase-client/queries/people";

export async function sendConnectionRequest(receiverId: string, eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await sendConnectionRequestMutation(supabase, user.id, receiverId, eventId);
  revalidatePath("/people");
}

export async function respondToConnection(connectionId: string, status: "accepted" | "declined") {
  const supabase = await createClient();

  await respondToConnectionMutation(supabase, connectionId, status);
  revalidatePath("/people");
}

export async function getConnectionsForEvent(eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { sent: [], received: [] };

  return _getConnectionsForEvent(supabase, user.id, eventId);
}

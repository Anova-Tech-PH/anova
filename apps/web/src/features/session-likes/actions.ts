"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function toggleSessionLike(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { data: existing } = await supabase
    .from("session_likes")
    .select("id")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    await supabase
      .from("session_likes")
      .delete()
      .eq("session_id", sessionId)
      .eq("user_id", user.id);
  } else {
    const { error } = await supabase
      .from("session_likes")
      .insert({ session_id: sessionId, user_id: user.id });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/");
  return { liked: !existing };
}

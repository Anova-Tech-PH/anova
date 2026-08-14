"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveNote(sessionId: string, content: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("session_notes").upsert(
    {
      session_id: sessionId,
      user_id: user.id,
      content,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id,user_id" }
  );
  if (error) throw error;
  revalidatePath("/");
}

import { createClient } from "@attendly/ui/supabase/server";
import { getPostsByEvent as getPostsByEventQuery } from "@attendly/supabase-client/queries/social";

export async function getPostsByEvent(eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return getPostsByEventQuery(supabase, eventId, user?.id);
}

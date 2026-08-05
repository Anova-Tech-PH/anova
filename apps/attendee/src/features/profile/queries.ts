import { createClient } from "@attendly/ui/supabase/server";
import { getProfile as _getProfile } from "@attendly/supabase-client/queries/profile";
import { getEventAttendees as _getEventAttendees } from "@attendly/supabase-client/queries/people";

export async function getCurrentProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  return _getProfile(supabase, user.id);
}

export async function getEventAttendees(eventId: string) {
  const supabase = await createClient();
  return _getEventAttendees(supabase, eventId);
}

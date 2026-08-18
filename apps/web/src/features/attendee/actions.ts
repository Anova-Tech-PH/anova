"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export async function checkUserExistsByEmail(email: string): Promise<boolean> {
  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 });
  return users.some((u) => u.email === email);
}

export async function createAttendeeAccount(data: {
  email: string;
  password: string;
  fullName: string;
}) {
  const supabase = await createClient();

  // Try to create a new account
  const { data: authData, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: { full_name: data.fullName },
    },
  });

  let userId: string;

  if (error?.message === "User already registered") {
    // Account exists — sign them in instead
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
    if (signInError) throw new Error(signInError.message);
    if (!signInData.user) throw new Error("Sign in failed");
    userId = signInData.user.id;
  } else if (error) {
    throw new Error(error.message);
  } else if (!authData.user) {
    throw new Error("Account creation failed");
  } else {
    userId = authData.user.id;
  }

  // Link existing registrations by email to this new account.
  // Use service role client — the authenticated user's RLS can't update rows where user_id IS NULL.
  const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  await adminClient
    .from("registrations")
    .update({ user_id: userId, updated_at: new Date().toISOString() })
    .eq("email", data.email)
    .is("user_id", null);

  return { userId };
}

export async function toggleSessionBookmark(sessionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { data: existing } = await supabase
    .from("session_bookmarks")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("session_id", sessionId)
    .single();

  if (existing) {
    await supabase
      .from("session_bookmarks")
      .delete()
      .eq("user_id", user.id)
      .eq("session_id", sessionId);
  } else {
    const { error } = await supabase
      .from("session_bookmarks")
      .insert({ user_id: user.id, session_id: sessionId });
    if (error) throw new Error(error.message);
  }

  revalidatePath("/my/schedule");
  return { bookmarked: !existing };
}

export async function updateMyProfile(data: {
  full_name: string;
  bio?: string;
  company?: string;
  job_title?: string;
  linkedin_url?: string;
  twitter_handle?: string;
  interests?: string[];
  looking_for?: string[];
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { error } = await supabase
    .from("profiles")
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
  revalidatePath("/my/profile");
}

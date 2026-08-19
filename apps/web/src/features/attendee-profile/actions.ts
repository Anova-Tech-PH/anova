"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfile(
  eventId: string,
  data: {
    display_name: string;
    avatar_url?: string;
    title?: string;
    company?: string;
    location?: string;
    bio?: string;
    is_visible_in_directory?: boolean;
    phone?: string;
    contact_email?: string;
    address?: string;
    show_phone?: boolean;
    show_email?: boolean;
    show_address?: boolean;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("attendee_profiles")
    .upsert({
      id: user.id,
      event_id: eventId,
      display_name: data.display_name,
      avatar_url: data.avatar_url ?? null,
      title: data.title ?? null,
      company: data.company ?? null,
      location: data.location ?? null,
      bio: data.bio ?? null,
      is_visible_in_directory: data.is_visible_in_directory ?? true,
      phone: data.phone ?? null,
      contact_email: data.contact_email ?? null,
      address: data.address ?? null,
      show_phone: data.show_phone ?? false,
      show_email: data.show_email ?? false,
      show_address: data.show_address ?? false,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id,event_id" });

  if (error) throw error;
  revalidatePath("/");
}

export async function toggleAttendeeBookmark(eventId: string, targetUserId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Check if already bookmarked
  const { data: existing } = await supabase
    .from("attendee_bookmarks")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("bookmarked_user_id", targetUserId)
    .eq("event_id", eventId)
    .single();

  if (existing) {
    await supabase
      .from("attendee_bookmarks")
      .delete()
      .eq("user_id", user.id)
      .eq("bookmarked_user_id", targetUserId)
      .eq("event_id", eventId);
  } else {
    await supabase
      .from("attendee_bookmarks")
      .insert({
        user_id: user.id,
        bookmarked_user_id: targetUserId,
        event_id: eventId,
      });
  }

  revalidatePath("/");
}

export async function saveAttendeeNote(targetUserId: string, content: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("attendee_notes")
    .upsert(
      {
        target_user_id: targetUserId,
        user_id: user.id,
        content,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "target_user_id,user_id" }
    );

  if (error) throw error;
  revalidatePath("/", "layout");
}

export async function updateProfileInterests(eventId: string, interestIds: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Delete existing interests
  await supabase
    .from("attendee_interests")
    .delete()
    .eq("user_id", user.id);

  // Insert new ones
  if (interestIds.length > 0) {
    await supabase
      .from("attendee_interests")
      .insert(interestIds.map(id => ({ user_id: user.id, interest_id: id })));
  }

  revalidatePath("/");
}

// ============================================================
// Affiliations
// ============================================================

export async function addAffiliation(
  eventId: string,
  data: {
    organization: string;
    role?: string;
    start_date?: string | null;
    end_date?: string | null;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  if (!data.organization?.trim()) throw new Error("Organization is required");
  if (data.organization.length > 200) throw new Error("Organization too long");

  const { error } = await supabase
    .from("attendee_affiliations")
    .insert({
      user_id: user.id,
      event_id: eventId,
      organization: data.organization.trim(),
      role: data.role?.trim() || null,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
    });

  if (error) throw error;
  revalidatePath("/");
}

export async function updateAffiliation(
  id: string,
  data: {
    organization: string;
    role?: string;
    start_date?: string | null;
    end_date?: string | null;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("attendee_affiliations")
    .update({
      organization: data.organization.trim(),
      role: data.role?.trim() || null,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath("/");
}

export async function removeAffiliation(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("attendee_affiliations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath("/");
}

// ============================================================
// Education
// ============================================================

export async function addEducation(
  eventId: string,
  data: {
    school: string;
    degree?: string;
    field_of_study?: string;
    start_year?: number;
    end_year?: number | null;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  if (!data.school?.trim()) throw new Error("School is required");
  if (data.school.length > 200) throw new Error("School name too long");

  const { error } = await supabase
    .from("attendee_education")
    .insert({
      user_id: user.id,
      event_id: eventId,
      school: data.school.trim(),
      degree: data.degree?.trim() || null,
      field_of_study: data.field_of_study?.trim() || null,
      start_year: data.start_year || null,
      end_year: data.end_year ?? null,
    });

  if (error) throw error;
  revalidatePath("/");
}

export async function updateEducation(
  id: string,
  data: {
    school: string;
    degree?: string;
    field_of_study?: string;
    start_year?: number;
    end_year?: number | null;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("attendee_education")
    .update({
      school: data.school.trim(),
      degree: data.degree?.trim() || null,
      field_of_study: data.field_of_study?.trim() || null,
      start_year: data.start_year || null,
      end_year: data.end_year ?? null,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath("/");
}

export async function removeEducation(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("attendee_education")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) throw error;
  revalidatePath("/");
}

// ============================================================
// Links
// ============================================================

type ProfileLink = {
  type: "linkedin" | "twitter" | "github" | "website" | "other";
  url: string;
  label?: string;
};

export async function updateProfileLinks(eventId: string, links: ProfileLink[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  if (links.length > 10) throw new Error("Maximum 10 links allowed");

  for (const link of links) {
    if (!link.url.startsWith("https://") && !link.url.startsWith("http://")) {
      throw new Error("URLs must start with https:// or http://");
    }
  }

  const { error } = await supabase
    .from("attendee_profiles")
    .update({ links })
    .eq("id", user.id)
    .eq("event_id", eventId);

  if (error) throw error;
  revalidatePath("/");
}

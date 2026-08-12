"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function createSponsor(
  eventId: string,
  data: {
    name: string;
    tier_id?: string | null;
    logo?: string | null;
    description?: string | null;
    website_url?: string | null;
    promo_video_url?: string | null;
    booth_enabled?: boolean;
    contact_email?: string | null;
    sort_order?: number;
  }
) {
  const supabase = await createClient();

  const { data: sponsor, error } = await supabase
    .from("sponsors")
    .insert({
      event_id: eventId,
      name: data.name,
      tier_id: data.tier_id ?? null,
      logo: data.logo ?? null,
      description: data.description ?? null,
      website_url: data.website_url ?? null,
      promo_video_url: data.promo_video_url ?? null,
      booth_enabled: data.booth_enabled ?? false,
      contact_email: data.contact_email ?? null,
      sort_order: data.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/sponsors`);
  return sponsor;
}

export async function updateSponsor(
  eventId: string,
  sponsorId: string,
  data: {
    name?: string;
    tier_id?: string | null;
    logo?: string | null;
    description?: string | null;
    website_url?: string | null;
    promo_video_url?: string | null;
    booth_enabled?: boolean;
    contact_email?: string | null;
    sort_order?: number;
  }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("sponsors")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", sponsorId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/sponsors`);
}

export async function deleteSponsor(eventId: string, sponsorId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("sponsors")
    .delete()
    .eq("id", sponsorId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/sponsors`);
}

export async function bulkImportSponsors(
  eventId: string,
  rows: {
    name: string;
    logo?: string;
    description?: string;
    website_url?: string;
    contact_email?: string;
    booth_enabled?: boolean;
    sort_order?: number;
  }[]
) {
  if (rows.length === 0) {
    throw new Error("No sponsors to import");
  }
  if (rows.length > 500) {
    throw new Error("Cannot import more than 500 sponsors at once");
  }

  const supabase = await createClient();

  const insertData = rows.map((row) => ({
    event_id: eventId,
    name: row.name,
    logo: row.logo || null,
    description: row.description || null,
    website_url: row.website_url || null,
    contact_email: row.contact_email || null,
    booth_enabled: row.booth_enabled ?? false,
    sort_order: row.sort_order ?? 0,
  }));

  const { data, error } = await supabase
    .from("sponsors")
    .insert(insertData)
    .select();

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/sponsors`);
  return data;
}

export async function createSponsorDocument(
  sponsorId: string,
  eventId: string,
  data: {
    title: string;
    file_url: string;
    file_type?: string | null;
  }
) {
  const supabase = await createClient();

  const { data: doc, error } = await supabase
    .from("sponsor_documents")
    .insert({
      sponsor_id: sponsorId,
      title: data.title,
      file_url: data.file_url,
      file_type: data.file_type ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/sponsors`);
  return doc;
}

export async function deleteSponsorDocument(
  sponsorId: string,
  eventId: string,
  docId: string
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("sponsor_documents")
    .delete()
    .eq("id", docId)
    .eq("sponsor_id", sponsorId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/sponsors`);
}

export async function createSponsorCoupon(
  sponsorId: string,
  eventId: string,
  data: {
    code: string;
    description?: string | null;
    discount_value: number;
    discount_type?: "percentage" | "fixed";
    valid_until?: string | null;
    max_uses?: number | null;
  }
) {
  const supabase = await createClient();

  const { data: coupon, error } = await supabase
    .from("sponsor_coupons")
    .insert({
      sponsor_id: sponsorId,
      code: data.code,
      description: data.description ?? null,
      discount_value: data.discount_value,
      discount_type: data.discount_type ?? "percentage",
      valid_until: data.valid_until ?? null,
      max_uses: data.max_uses ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/sponsors`);
  return coupon;
}

export async function deleteSponsorCoupon(
  sponsorId: string,
  eventId: string,
  couponId: string
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("sponsor_coupons")
    .delete()
    .eq("id", couponId)
    .eq("sponsor_id", sponsorId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/sponsors`);
}

export async function submitLead(
  sponsorId: string,
  eventId: string,
  data: {
    name: string;
    email: string;
    company?: string | null;
    job_title?: string | null;
    notes?: string | null;
  }
) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) throw new Error("Not authenticated");

  const { data: lead, error } = await supabase
    .from("sponsor_leads")
    .insert({
      sponsor_id: sponsorId,
      event_id: eventId,
      user_id: user.id,
      name: data.name,
      email: data.email,
      company: data.company ?? null,
      job_title: data.job_title ?? null,
      notes: data.notes ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/sponsors`);
  return lead;
}

export async function sendBoothMessage(
  sponsorId: string,
  eventId: string,
  message: string
) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) throw new Error("Not authenticated");

  const { data: msg, error } = await supabase
    .from("booth_messages")
    .insert({
      sponsor_id: sponsorId,
      event_id: eventId,
      user_id: user.id,
      message,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/sponsors`);
  return msg;
}

export async function recordBoothVisit(sponsorId: string, eventId: string) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("booth_visits")
    .upsert(
      {
        sponsor_id: sponsorId,
        event_id: eventId,
        user_id: user.id,
      },
      { onConflict: "sponsor_id,user_id" }
    );

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/sponsors`);
}

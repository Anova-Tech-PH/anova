"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";

type AddAttendeeData = {
  name: string;
  email: string;
  title?: string;
  company?: string;
  category_id?: string;
};

export async function addAttendee(eventId: string, data: AddAttendeeData) {
  if (!data.name?.trim()) throw new Error("Name is required");
  if (!data.email?.trim()) throw new Error("Email is required");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  // Pick the first ticket type for this event as default
  const { data: defaultTicket } = await supabase
    .from("ticket_types")
    .select("id")
    .eq("event_id", eventId)
    .order("sort_order")
    .limit(1)
    .single();

  if (!defaultTicket) throw new Error("No ticket types configured for this event");

  // Check for duplicate email
  const { data: existing } = await supabase
    .from("registrations")
    .select("id")
    .eq("event_id", eventId)
    .eq("email", data.email.trim().toLowerCase())
    .limit(1);

  if (existing && existing.length > 0) {
    throw new Error("An attendee with this email already exists for this event");
  }

  const { error } = await supabase.from("registrations").insert({
    event_id: eventId,
    ticket_type_id: defaultTicket.id,
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    title: data.title?.trim() || null,
    company: data.company?.trim() || null,
    category_id: data.category_id || null,
    status: "confirmed",
    qr_code: nanoid(16),
    custom_fields: {},
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/registrations`);
}

export async function importAttendees(eventId: string, csvContent: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const lines = csvContent.trim().split("\n");
  if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row");

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const nameIdx = headers.indexOf("name");
  const emailIdx = headers.indexOf("email");

  if (nameIdx === -1 || emailIdx === -1) {
    throw new Error("CSV must have name and email columns");
  }

  const titleIdx = headers.indexOf("title");
  const companyIdx = headers.indexOf("company");
  const categoryIdx = headers.indexOf("category");

  // Collect unique category strings from CSV and resolve to category_id
  const categoryStrings = new Set<string>();
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    const catVal = categoryIdx >= 0 ? cols[categoryIdx] : "";
    if (catVal) categoryStrings.add(catVal);
  }

  const categoryMap = new Map<string, string>(); // lowercase name -> id
  if (categoryStrings.size > 0) {
    const { data: existingCats } = await supabase
      .from("attendee_categories")
      .select("id, name")
      .eq("event_id", eventId);
    for (const cat of existingCats ?? []) {
      categoryMap.set(cat.name.toLowerCase(), cat.id);
    }
    for (const catName of categoryStrings) {
      if (!categoryMap.has(catName.toLowerCase())) {
        const { data: newCat } = await supabase
          .from("attendee_categories")
          .insert({ event_id: eventId, name: catName, color: "blue", sort_order: 0 })
          .select("id")
          .single();
        if (newCat) categoryMap.set(catName.toLowerCase(), newCat.id);
      }
    }
  }

  // Pick the first ticket type for this event as default
  const { data: defaultTicket } = await supabase
    .from("ticket_types")
    .select("id")
    .eq("event_id", eventId)
    .order("sort_order")
    .limit(1)
    .single();

  if (!defaultTicket) throw new Error("No ticket types configured for this event");

  const rows: Record<string, unknown>[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    const name = cols[nameIdx] || "";
    const email = cols[emailIdx] || "";

    if (!name || !email) {
      errors.push(`Row ${i + 1}: missing name or email`);
      continue;
    }

    rows.push({
      event_id: eventId,
      ticket_type_id: defaultTicket.id,
      name,
      email: email.toLowerCase(),
      title: titleIdx >= 0 ? cols[titleIdx] || null : null,
      company: companyIdx >= 0 ? cols[companyIdx] || null : null,
      category_id:
        categoryIdx >= 0 && cols[categoryIdx]
          ? categoryMap.get(cols[categoryIdx].toLowerCase()) ?? null
          : null,
      status: "confirmed",
      qr_code: nanoid(16),
      custom_fields: {},
    });
  }

  if (rows.length > 0) {
    const { error } = await supabase.from("registrations").insert(rows);
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/events/${eventId}/registrations`);
  return { imported: rows.length, errors };
}

export async function updateAttendee(
  eventId: string,
  attendeeId: string,
  data: { name?: string; email?: string; title?: string; company?: string; category_id?: string }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.name !== undefined) update.name = data.name.trim();
  if (data.email !== undefined) update.email = data.email.trim().toLowerCase();
  if (data.title !== undefined) update.title = data.title.trim() || null;
  if (data.company !== undefined) update.company = data.company.trim() || null;
  if (data.category_id !== undefined) update.category_id = data.category_id || null;

  const { error } = await supabase
    .from("registrations")
    .update(update)
    .eq("id", attendeeId)
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/registrations`);
}

export async function deleteAttendee(eventId: string, attendeeId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { error } = await supabase
    .from("registrations")
    .delete()
    .eq("id", attendeeId)
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/registrations`);
}

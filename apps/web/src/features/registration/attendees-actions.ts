"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";

type AddAttendeeData = {
  name: string;
  email: string;
  title?: string;
  company?: string;
  category?: string;
};

export async function addAttendee(eventId: string, data: AddAttendeeData) {
  if (!data.name?.trim()) throw new Error("Name is required");
  if (!data.email?.trim()) throw new Error("Email is required");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { error } = await supabase.from("registrations").insert({
    event_id: eventId,
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    title: data.title?.trim() || null,
    company: data.company?.trim() || null,
    category: data.category?.trim() || null,
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
      name,
      email: email.toLowerCase(),
      title: titleIdx >= 0 ? cols[titleIdx] || null : null,
      company: companyIdx >= 0 ? cols[companyIdx] || null : null,
      category: categoryIdx >= 0 ? cols[categoryIdx] || null : null,
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

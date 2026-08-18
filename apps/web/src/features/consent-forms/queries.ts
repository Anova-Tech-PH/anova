import { createClient } from "@attendly/ui/supabase/server";

// ─── Types ───────────────────────────────────────────────────

export type ConsentForm = {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  audience: "all" | "attendees" | "speakers" | "volunteers";
  require_before_checkin: boolean;
  status: "draft" | "published";
  created_at: string;
  updated_at: string;
};

export type ConsentFormElement = {
  id: string;
  form_id: string;
  type: "description" | "checkbox" | "text" | "textarea" | "signature";
  label: string;
  is_required: boolean;
  sort_order: number;
  created_at: string;
};

export type ConsentFormSubmission = {
  id: string;
  form_id: string;
  event_id: string;
  user_id: string | null;
  email: string;
  name: string;
  signed_name: string;
  answers: Record<string, unknown>;
  signed_at: string;
  created_at: string;
};

// ─── Organizer Queries ───────────────────────────────────────

export async function getConsentForms(
  eventId: string
): Promise<ConsentForm[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("consent_forms")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as ConsentForm[];
}

export async function getConsentForm(
  formId: string
): Promise<ConsentForm | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("consent_forms")
    .select("*")
    .eq("id", formId)
    .single();

  if (error || !data) return null;
  return data as ConsentForm;
}

export async function getConsentFormElements(
  formId: string
): Promise<ConsentFormElement[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("consent_form_elements")
    .select("*")
    .eq("form_id", formId)
    .order("sort_order");

  if (error) return [];
  return (data ?? []) as ConsentFormElement[];
}

export async function getSubmissions(
  formId: string,
  filters?: { search?: string }
): Promise<ConsentFormSubmission[]> {
  const supabase = await createClient();

  let query = supabase
    .from("consent_form_submissions")
    .select("*")
    .eq("form_id", formId)
    .order("signed_at", { ascending: false });

  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []) as ConsentFormSubmission[];
}

export async function getSubmissionCount(formId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("consent_form_submissions")
    .select("*", { count: "exact", head: true })
    .eq("form_id", formId);

  if (error) return 0;
  return count ?? 0;
}

export async function getFormStats(eventId: string): Promise<{
  total: number;
  published: number;
  totalSubmissions: number;
}> {
  const supabase = await createClient();

  const [formsResult, publishedResult, submissionsResult] = await Promise.all([
    supabase
      .from("consent_forms")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId),
    supabase
      .from("consent_forms")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("status", "published"),
    supabase
      .from("consent_form_submissions")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId),
  ]);

  return {
    total: formsResult.count ?? 0,
    published: publishedResult.count ?? 0,
    totalSubmissions: submissionsResult.count ?? 0,
  };
}

// ─── Public Queries ──────────────────────────────────────────

export async function getPublicConsentForm(formId: string): Promise<{
  form: ConsentForm;
  elements: ConsentFormElement[];
} | null> {
  const supabase = await createClient();

  const [formResult, elementsResult] = await Promise.all([
    supabase
      .from("consent_forms")
      .select("*")
      .eq("id", formId)
      .eq("status", "published")
      .single(),
    supabase
      .from("consent_form_elements")
      .select("*")
      .eq("form_id", formId)
      .order("sort_order"),
  ]);

  if (!formResult.data) return null;

  return {
    form: formResult.data as ConsentForm,
    elements: (elementsResult.data ?? []) as ConsentFormElement[],
  };
}

// ─── Check-in Query ──────────────────────────────────────────

export async function getPendingConsentForms(
  eventId: string,
  email: string
): Promise<ConsentForm[]> {
  const supabase = await createClient();

  // Get all published forms that require signing before check-in
  const { data: forms, error } = await supabase
    .from("consent_forms")
    .select("*")
    .eq("event_id", eventId)
    .eq("status", "published")
    .eq("require_before_checkin", true);

  if (error || !forms || forms.length === 0) return [];

  // Get submissions for this email
  const formIds = forms.map((f) => f.id);
  const { data: submissions } = await supabase
    .from("consent_form_submissions")
    .select("form_id")
    .eq("event_id", eventId)
    .eq("email", email)
    .in("form_id", formIds);

  const signedFormIds = new Set((submissions ?? []).map((s) => s.form_id));

  // Return forms that haven't been signed yet
  return forms.filter((f) => !signedFormIds.has(f.id)) as ConsentForm[];
}

# Release & Consent Forms Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a general event compliance tool for collecting signed waivers and consent forms from attendees, speakers, and volunteers.

**Architecture:** Standalone feature module with 3 database tables (consent_forms, consent_form_elements, consent_form_submissions), server actions/queries following the volunteer module pattern, organizer pages for form building and submission tracking, a public signing page, email distribution, and check-in enforcement integration.

**Tech Stack:** Next.js 16, React 19, Supabase (PostgreSQL + RLS), Server Actions, Resend (email), TypeScript, Tailwind 4, lucide-react icons, sonner toasts

---

### Task 1: Database Migration

**Files:**
- Create: `packages/supabase/migrations/099_consent_forms.sql`

**Step 1: Write the migration**

```sql
-- =============================================================
-- 099 – Release & Consent Forms
-- =============================================================

-- -----------------------------------------------------------
-- 1. consent_forms (max 2 per event, enforced at app level)
-- -----------------------------------------------------------
CREATE TABLE public.consent_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  audience text NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'attendees', 'speakers', 'volunteers')),
  require_before_checkin boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_consent_forms_event ON public.consent_forms(event_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.consent_forms TO authenticated;
GRANT SELECT ON public.consent_forms TO anon;

ALTER TABLE public.consent_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage consent forms"
  ON public.consent_forms FOR ALL TO authenticated
  USING (public.has_event_access(event_id, 'admin'))
  WITH CHECK (public.has_event_access(event_id, 'admin'));

CREATE POLICY "Public can view published consent forms"
  ON public.consent_forms FOR SELECT TO anon
  USING (status = 'published');

-- -----------------------------------------------------------
-- 2. consent_form_elements (form content blocks)
-- -----------------------------------------------------------
CREATE TABLE public.consent_form_elements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.consent_forms(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('description', 'checkbox', 'text', 'textarea', 'signature')),
  label text NOT NULL,
  is_required boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_consent_form_elements_form ON public.consent_form_elements(form_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.consent_form_elements TO authenticated;
GRANT SELECT ON public.consent_form_elements TO anon;

ALTER TABLE public.consent_form_elements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage consent form elements"
  ON public.consent_form_elements FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.consent_forms cf
    WHERE cf.id = consent_form_elements.form_id
      AND public.has_event_access(cf.event_id, 'admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.consent_forms cf
    WHERE cf.id = consent_form_elements.form_id
      AND public.has_event_access(cf.event_id, 'admin')
  ));

CREATE POLICY "Public can view published form elements"
  ON public.consent_form_elements FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.consent_forms cf
    WHERE cf.id = consent_form_elements.form_id AND cf.status = 'published'
  ));

-- -----------------------------------------------------------
-- 3. consent_form_submissions (one per person per form)
-- -----------------------------------------------------------
CREATE TABLE public.consent_form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.consent_forms(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  name text NOT NULL,
  signed_name text NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}',
  signed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_consent_form_submissions_unique ON public.consent_form_submissions(form_id, email);
CREATE INDEX idx_consent_form_submissions_event ON public.consent_form_submissions(event_id);
CREATE INDEX idx_consent_form_submissions_form ON public.consent_form_submissions(form_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.consent_form_submissions TO authenticated;
GRANT SELECT, INSERT ON public.consent_form_submissions TO anon;

ALTER TABLE public.consent_form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage submissions"
  ON public.consent_form_submissions FOR ALL TO authenticated
  USING (public.has_event_access(event_id, 'admin'))
  WITH CHECK (public.has_event_access(event_id, 'admin'));

CREATE POLICY "Public can submit to published forms"
  ON public.consent_form_submissions FOR INSERT TO anon
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.consent_forms cf
    WHERE cf.id = consent_form_submissions.form_id AND cf.status = 'published'
  ));

CREATE POLICY "Users can view own submissions"
  ON public.consent_form_submissions FOR SELECT TO authenticated
  USING (user_id = auth.uid());
```

**Step 2: Run the migration**

Run: `cd packages/supabase && npx supabase migration up`
Expected: Migration applied successfully, 3 tables created.

**Step 3: Verify tables exist**

Run: `cd packages/supabase && npx supabase db query "SELECT tablename FROM pg_tables WHERE tablename LIKE 'consent_form%' ORDER BY tablename;"`
Expected: consent_form_elements, consent_form_submissions, consent_forms

**Step 4: Commit**

```bash
git add packages/supabase/migrations/099_consent_forms.sql
git commit -m "feat: add consent_forms migration (3 tables with RLS)"
```

---

### Task 2: Queries Module

**Files:**
- Create: `apps/web/src/features/consent-forms/queries.ts`

**Step 1: Create the queries file**

```typescript
import { createClient } from "@attendly/ui/supabase/server";

// ---------- Types ----------

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
  answers: Record<string, string | boolean>;
  signed_at: string;
  created_at: string;
};

// ---------- Organizer Queries ----------

export async function getConsentForms(eventId: string): Promise<ConsentForm[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("consent_forms")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at");

  if (error) return [];
  return (data ?? []) as ConsentForm[];
}

export async function getConsentForm(formId: string): Promise<ConsentForm | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("consent_forms")
    .select("*")
    .eq("id", formId)
    .single();

  if (error) return null;
  return data as ConsentForm;
}

export async function getConsentFormElements(formId: string): Promise<ConsentFormElement[]> {
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
  formId: string
): Promise<ConsentFormSubmission[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("consent_form_submissions")
    .select("*")
    .eq("form_id", formId)
    .order("signed_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as ConsentFormSubmission[];
}

export async function getSubmissionCount(formId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("consent_form_submissions")
    .select("id", { count: "exact", head: true })
    .eq("form_id", formId);

  if (error) return 0;
  return count ?? 0;
}

export async function getFormStats(eventId: string): Promise<{
  formId: string;
  title: string;
  submissionCount: number;
}[]> {
  const forms = await getConsentForms(eventId);
  const stats = await Promise.all(
    forms.map(async (form) => ({
      formId: form.id,
      title: form.title,
      submissionCount: await getSubmissionCount(form.id),
    }))
  );
  return stats;
}

// ---------- Public Queries ----------

export async function getPublicConsentForm(formId: string): Promise<{
  form: ConsentForm;
  elements: ConsentFormElement[];
} | null> {
  const supabase = await createClient();

  const { data: form, error } = await supabase
    .from("consent_forms")
    .select("*")
    .eq("id", formId)
    .eq("status", "published")
    .single();

  if (error || !form) return null;

  const { data: elements } = await supabase
    .from("consent_form_elements")
    .select("*")
    .eq("form_id", formId)
    .order("sort_order");

  return {
    form: form as ConsentForm,
    elements: (elements ?? []) as ConsentFormElement[],
  };
}

// ---------- Check-in Query ----------

export async function getPendingConsentForms(
  eventId: string,
  email: string
): Promise<{ id: string; title: string }[]> {
  const supabase = await createClient();

  // Get published forms that require check-in completion
  const { data: forms } = await supabase
    .from("consent_forms")
    .select("id, title")
    .eq("event_id", eventId)
    .eq("status", "published")
    .eq("require_before_checkin", true);

  if (!forms || forms.length === 0) return [];

  // Get submissions for this email
  const { data: submissions } = await supabase
    .from("consent_form_submissions")
    .select("form_id")
    .eq("event_id", eventId)
    .eq("email", email);

  const signedFormIds = new Set((submissions ?? []).map((s) => s.form_id));

  return forms.filter((f) => !signedFormIds.has(f.id));
}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/consent-forms/queries.ts
git commit -m "feat: add consent-forms queries module with types"
```

---

### Task 3: Server Actions

**Files:**
- Create: `apps/web/src/features/consent-forms/actions.ts`

**Step 1: Create the actions file**

```typescript
"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/features/emails/lib/send-email";

// ---------- Form Templates ----------

type TemplateKey =
  | "speaker_media_release"
  | "volunteer_liability_waiver"
  | "photo_video_consent"
  | "event_code_of_conduct"
  | "excursion_activity_waiver";

const TEMPLATES: Record<
  TemplateKey,
  {
    title: string;
    description: string;
    audience: "all" | "attendees" | "speakers" | "volunteers";
    elements: { type: string; label: string; is_required: boolean }[];
  }
> = {
  speaker_media_release: {
    title: "Speaker Media Release",
    description:
      "By signing this form, you grant permission for event organizers to photograph, record, and distribute media from your session(s).",
    audience: "speakers",
    elements: [
      {
        type: "description",
        label:
          "I hereby grant the event organizers, their affiliates, and assigns the irrevocable right to use, reproduce, and distribute photographs, video recordings, and audio recordings of my presentation(s) and likeness for promotional, educational, and archival purposes. This includes but is not limited to: event recap videos, social media posts, marketing materials, and website content.",
        is_required: false,
      },
      {
        type: "checkbox",
        label:
          "I grant permission to photograph, video record, and audio record my session(s) and use the resulting media for event-related purposes.",
        is_required: true,
      },
      {
        type: "checkbox",
        label:
          "I understand that I will not receive compensation for the use of my likeness or recordings.",
        is_required: true,
      },
      {
        type: "textarea",
        label: "Additional conditions or restrictions (if any)",
        is_required: false,
      },
      { type: "signature", label: "Full Legal Name", is_required: true },
    ],
  },
  volunteer_liability_waiver: {
    title: "Volunteer Liability Waiver",
    description:
      "Please review and sign this waiver before participating in volunteer activities.",
    audience: "volunteers",
    elements: [
      {
        type: "description",
        label:
          "In consideration of being permitted to participate as a volunteer, I acknowledge that volunteering may involve physical activities including but not limited to: setup and teardown of event spaces, moving equipment, standing for extended periods, and other tasks. I understand these activities carry inherent risks of injury.",
        is_required: false,
      },
      {
        type: "checkbox",
        label:
          "I acknowledge the potential risks involved in volunteer activities and voluntarily assume all such risks.",
        is_required: true,
      },
      {
        type: "checkbox",
        label:
          "I release and hold harmless the event organizers, sponsors, and venue from any claims arising from my participation as a volunteer.",
        is_required: true,
      },
      {
        type: "text",
        label: "Emergency Contact Name",
        is_required: true,
      },
      {
        type: "text",
        label: "Emergency Contact Phone",
        is_required: true,
      },
      { type: "signature", label: "Full Legal Name", is_required: true },
    ],
  },
  photo_video_consent: {
    title: "Photo & Video Consent",
    description:
      "We may photograph or record portions of this event. Please review and sign this consent form.",
    audience: "all",
    elements: [
      {
        type: "description",
        label:
          "During this event, photographs and video recordings may be taken by event staff, contracted photographers, or other attendees. These images may be used in future promotional materials, social media, websites, and publications related to the event and the organizing body.",
        is_required: false,
      },
      {
        type: "checkbox",
        label:
          "I consent to being photographed and/or video recorded during this event.",
        is_required: true,
      },
      {
        type: "checkbox",
        label:
          "I grant permission for the use of my image/likeness in event-related materials without compensation.",
        is_required: true,
      },
      { type: "signature", label: "Full Legal Name", is_required: true },
    ],
  },
  event_code_of_conduct: {
    title: "Event Code of Conduct",
    description:
      "All participants are expected to adhere to the following code of conduct.",
    audience: "all",
    elements: [
      {
        type: "description",
        label:
          "This event is dedicated to providing a harassment-free experience for everyone. We do not tolerate harassment of participants in any form. Participants asked to stop any harassing behavior are expected to comply immediately. Participants violating these rules may be expelled from the event at the discretion of the organizers.",
        is_required: false,
      },
      {
        type: "description",
        label:
          "Expected behavior includes: using welcoming and inclusive language, being respectful of differing viewpoints and experiences, gracefully accepting constructive criticism, and focusing on what is best for the community.",
        is_required: false,
      },
      {
        type: "checkbox",
        label:
          "I have read and agree to abide by the event code of conduct.",
        is_required: true,
      },
      {
        type: "checkbox",
        label:
          "I understand that violations may result in removal from the event without a refund.",
        is_required: true,
      },
      { type: "signature", label: "Full Legal Name", is_required: true },
    ],
  },
  excursion_activity_waiver: {
    title: "Excursion / Activity Liability Waiver",
    description:
      "Please sign this waiver before participating in event excursions, tours, or physical activities.",
    audience: "attendees",
    elements: [
      {
        type: "description",
        label:
          "Participation in excursions, tours, games, and physical activities associated with this event involves certain risks, including but not limited to: physical injury, property damage, and other hazards. By signing this waiver, you acknowledge these risks and agree to release the event organizers from liability.",
        is_required: false,
      },
      {
        type: "checkbox",
        label:
          "I understand the risks associated with participation and voluntarily assume all such risks.",
        is_required: true,
      },
      {
        type: "checkbox",
        label:
          "I release the event organizers, sponsors, and venue from any liability arising from my participation.",
        is_required: true,
      },
      {
        type: "checkbox",
        label:
          "I confirm that I am physically able to participate in the planned activities.",
        is_required: true,
      },
      {
        type: "text",
        label: "Emergency Contact Name",
        is_required: true,
      },
      {
        type: "text",
        label: "Emergency Contact Phone",
        is_required: true,
      },
      { type: "signature", label: "Full Legal Name", is_required: true },
    ],
  },
};

// ---------- Form CRUD ----------

export async function createConsentForm(
  eventId: string,
  templateKey?: TemplateKey
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  // Enforce max 2 forms per event
  const { count } = await supabase
    .from("consent_forms")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);

  if ((count ?? 0) >= 2) {
    throw new Error("Maximum of 2 consent forms per event");
  }

  const template = templateKey ? TEMPLATES[templateKey] : null;

  const { data: form, error } = await supabase
    .from("consent_forms")
    .insert({
      event_id: eventId,
      title: template?.title ?? "Untitled Form",
      description: template?.description ?? null,
      audience: template?.audience ?? "all",
      status: "draft",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Insert template elements if using a template
  if (template && template.elements.length > 0) {
    const elements = template.elements.map((el, i) => ({
      form_id: form.id,
      type: el.type,
      label: el.label,
      is_required: el.is_required,
      sort_order: i,
    }));

    await supabase.from("consent_form_elements").insert(elements);
  }

  revalidatePath(`/events/${eventId}/consent-forms`);
  return form;
}

export async function updateConsentForm(
  eventId: string,
  formId: string,
  data: {
    title?: string;
    description?: string | null;
    audience?: "all" | "attendees" | "speakers" | "volunteers";
    require_before_checkin?: boolean;
    status?: "draft" | "published";
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { error } = await supabase
    .from("consent_forms")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", formId)
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/consent-forms`);
}

export async function deleteConsentForm(eventId: string, formId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { error } = await supabase
    .from("consent_forms")
    .delete()
    .eq("id", formId)
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/consent-forms`);
}

// ---------- Element CRUD ----------

export async function createElement(
  eventId: string,
  formId: string,
  data: {
    type: "description" | "checkbox" | "text" | "textarea" | "signature";
    label: string;
    is_required?: boolean;
  }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  // Get max sort_order
  const { data: existing } = await supabase
    .from("consent_form_elements")
    .select("sort_order")
    .eq("form_id", formId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const sortOrder = existing?.[0] ? existing[0].sort_order + 1 : 0;

  const { data: element, error } = await supabase
    .from("consent_form_elements")
    .insert({
      form_id: formId,
      type: data.type,
      label: data.label,
      is_required: data.is_required ?? true,
      sort_order: sortOrder,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/consent-forms`);
  return element;
}

export async function updateElement(
  eventId: string,
  elementId: string,
  data: { label?: string; is_required?: boolean }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { error } = await supabase
    .from("consent_form_elements")
    .update(data)
    .eq("id", elementId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/consent-forms`);
}

export async function deleteElement(eventId: string, elementId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { error } = await supabase
    .from("consent_form_elements")
    .delete()
    .eq("id", elementId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/consent-forms`);
}

export async function reorderElements(
  eventId: string,
  formId: string,
  elementIds: string[]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  for (let i = 0; i < elementIds.length; i++) {
    await supabase
      .from("consent_form_elements")
      .update({ sort_order: i })
      .eq("id", elementIds[i])
      .eq("form_id", formId);
  }

  revalidatePath(`/events/${eventId}/consent-forms`);
}

// ---------- Submissions ----------

export async function submitConsentForm(
  formId: string,
  data: {
    email: string;
    name: string;
    signed_name: string;
    answers: Record<string, string | boolean>;
  }
) {
  const supabase = await createClient();

  // Get form to verify it's published and get event_id
  const { data: form, error: formError } = await supabase
    .from("consent_forms")
    .select("id, event_id, status")
    .eq("id", formId)
    .single();

  if (formError || !form) return { error: "Form not found" };
  if (form.status !== "published") return { error: "This form is not currently accepting submissions" };

  // Check for existing submission
  const { data: existing } = await supabase
    .from("consent_form_submissions")
    .select("id, signed_at")
    .eq("form_id", formId)
    .eq("email", data.email.toLowerCase().trim())
    .single();

  if (existing) {
    return { error: "You have already signed this form", alreadySigned: true, signedAt: existing.signed_at };
  }

  // Get current user if authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("consent_form_submissions").insert({
    form_id: formId,
    event_id: form.event_id,
    user_id: user?.id ?? null,
    email: data.email.toLowerCase().trim(),
    name: data.name.trim(),
    signed_name: data.signed_name.trim(),
    answers: data.answers,
  });

  if (error) {
    if (error.code === "23505") return { error: "You have already signed this form" };
    return { error: error.message };
  }

  return { error: null };
}

// ---------- Email Distribution ----------

export async function sendConsentFormEmails(eventId: string, formId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  // Get form details
  const { data: form } = await supabase
    .from("consent_forms")
    .select("*")
    .eq("id", formId)
    .single();

  if (!form) throw new Error("Form not found");
  if (form.status !== "published") throw new Error("Form must be published before sending");

  // Get event + org info for building the URL
  const { data: event } = await supabase
    .from("events")
    .select("title, slug, organization_id, organizations(slug)")
    .eq("id", eventId)
    .single();

  if (!event) throw new Error("Event not found");

  const orgSlug = (event as any).organizations?.slug;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const formUrl = `${baseUrl}/${orgSlug}/${event.slug}/consent/${formId}`;

  // Get target recipients based on audience
  let recipients: { email: string; name: string }[] = [];

  if (form.audience === "all" || form.audience === "attendees") {
    const { data: attendees } = await supabase
      .from("registrations")
      .select("email, attendee_profiles(first_name, last_name)")
      .eq("event_id", eventId);
    if (attendees) {
      for (const a of attendees) {
        const profile = (a as any).attendee_profiles?.[0];
        const name = profile
          ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim()
          : "";
        recipients.push({ email: a.email, name: name || a.email });
      }
    }
  }

  if (form.audience === "all" || form.audience === "volunteers") {
    const { data: volunteers } = await supabase
      .from("volunteer_applications")
      .select("email, name")
      .eq("event_id", eventId)
      .eq("status", "accepted");
    if (volunteers) {
      for (const v of volunteers) {
        recipients.push({ email: v.email, name: v.name });
      }
    }
  }

  if (form.audience === "all" || form.audience === "speakers") {
    const { data: speakers } = await supabase
      .from("speakers")
      .select("email, name")
      .eq("event_id", eventId);
    if (speakers) {
      for (const s of speakers) {
        if (s.email) recipients.push({ email: s.email, name: s.name });
      }
    }
  }

  // Deduplicate by email
  const seen = new Set<string>();
  recipients = recipients.filter((r) => {
    const key = r.email.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Remove those who already signed
  const { data: submissions } = await supabase
    .from("consent_form_submissions")
    .select("email")
    .eq("form_id", formId);

  const signedEmails = new Set(
    (submissions ?? []).map((s) => s.email.toLowerCase())
  );
  recipients = recipients.filter((r) => !signedEmails.has(r.email.toLowerCase()));

  if (recipients.length === 0) return 0;

  // Fire-and-forget email sends
  const orgId = event.organization_id;
  const subject = `Please sign: ${form.title} — ${event.title}`;

  setTimeout(async () => {
    for (const recipient of recipients) {
      try {
        await sendEmail({
          organizationId: orgId,
          eventId,
          to: { email: recipient.email, name: recipient.name },
          subject,
          html: buildFormRequestEmail(
            recipient.name,
            form.title,
            event.title,
            formUrl
          ),
        });
      } catch {
        // Best-effort — skip failures
      }
    }
  }, 0);

  return recipients.length;
}

export async function sendConsentFormReminders(
  eventId: string,
  formId: string
) {
  // Same as sendConsentFormEmails — the filtering already excludes signed users
  return sendConsentFormEmails(eventId, formId);
}

// ---------- CSV Export ----------

export async function exportSubmissionsCsv(
  eventId: string,
  formId: string
): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { data: elements } = await supabase
    .from("consent_form_elements")
    .select("id, label, type")
    .eq("form_id", formId)
    .order("sort_order");

  const { data: submissions } = await supabase
    .from("consent_form_submissions")
    .select("*")
    .eq("form_id", formId)
    .order("signed_at", { ascending: false });

  if (!submissions || submissions.length === 0) return "";

  const answerableElements = (elements ?? []).filter(
    (e) => e.type !== "description"
  );

  // Build CSV header
  const headers = [
    "Name",
    "Email",
    "Signed Name",
    "Signed At",
    ...answerableElements.map((e) => e.label),
  ];

  // Build rows
  const rows = submissions.map((sub) => {
    const answers = (sub.answers ?? {}) as Record<string, string | boolean>;
    return [
      sub.name,
      sub.email,
      sub.signed_name,
      new Date(sub.signed_at).toISOString(),
      ...answerableElements.map((e) => {
        const val = answers[e.id];
        if (typeof val === "boolean") return val ? "Yes" : "No";
        return String(val ?? "");
      }),
    ];
  });

  const escapeCsv = (val: string) => {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const csvLines = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ];

  return csvLines.join("\n");
}

// ---------- Email Templates ----------

function buildFormRequestEmail(
  recipientName: string,
  formTitle: string,
  eventTitle: string,
  formUrl: string
): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1a1a1a;">Action Required: ${formTitle}</h2>
      <p>Hi ${recipientName},</p>
      <p>You are required to review and sign <strong>${formTitle}</strong> for <strong>${eventTitle}</strong>.</p>
      <p>Please click the button below to review and sign the form:</p>
      <p style="text-align: center; margin: 32px 0;">
        <a href="${formUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
          Review & Sign Form
        </a>
      </p>
      <p style="color: #666; font-size: 14px;">If you have already signed this form, you can disregard this message.</p>
    </div>
  `.trim();
}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/consent-forms/actions.ts
git commit -m "feat: add consent-forms server actions with templates and email"
```

---

### Task 4: Organizer List Page

**Files:**
- Create: `apps/web/src/features/consent-forms/components/consent-forms-page-client.tsx`
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/consent-forms/page.tsx` (currently at `release-consent-forms/page.tsx`)

**Step 1: Create the client component**

```typescript
"use client";

import { useState, useTransition } from "react";
import {
  Button,
  Card,
  CardContent,
  ModalOverlay,
} from "@attendly/ui/components";
import {
  FileText,
  Plus,
  Users,
  Mic,
  HandHelping,
  Trash2,
  Eye,
  Pencil,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/shared/hooks/use-confirm";
import { createConsentForm, deleteConsentForm } from "../actions";
import type { ConsentForm } from "../queries";

interface ConsentFormsPageClientProps {
  eventId: string;
  forms: (ConsentForm & { submissionCount: number })[];
}

const AUDIENCE_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  all: { label: "Everyone", icon: Globe },
  attendees: { label: "Attendees", icon: Users },
  speakers: { label: "Speakers", icon: Mic },
  volunteers: { label: "Volunteers", icon: HandHelping },
};

const TEMPLATE_OPTIONS = [
  { key: "speaker_media_release" as const, label: "Speaker Media Release", audience: "Speakers" },
  { key: "volunteer_liability_waiver" as const, label: "Volunteer Liability Waiver", audience: "Volunteers" },
  { key: "photo_video_consent" as const, label: "Photo & Video Consent", audience: "Everyone" },
  { key: "event_code_of_conduct" as const, label: "Event Code of Conduct", audience: "Everyone" },
  { key: "excursion_activity_waiver" as const, label: "Excursion / Activity Waiver", audience: "Attendees" },
] as const;

export function ConsentFormsPageClient({
  eventId,
  forms,
}: ConsentFormsPageClientProps) {
  const [isPending, startTransition] = useTransition();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirm();
  const router = useRouter();

  function handleCreate(templateKey?: string) {
    startTransition(async () => {
      try {
        const form = await createConsentForm(
          eventId,
          templateKey as any
        );
        toast.success("Form created");
        setShowCreateModal(false);
        router.push(`/events/${eventId}/consent-forms/${form.id}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create form");
      }
    });
  }

  async function handleDelete(formId: string, title: string) {
    const ok = await confirm({
      title: "Delete Form",
      description: `Are you sure you want to delete "${title}"? All submissions will be permanently lost.`,
      confirmText: "Delete",
      variant: "destructive",
    });
    if (!ok) return;

    startTransition(async () => {
      try {
        await deleteConsentForm(eventId, formId);
        toast.success("Form deleted");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Release & Consent Forms</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Collect signed waivers and consent forms from participants.
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          disabled={forms.length >= 2 || isPending}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Form
        </Button>
      </div>

      {forms.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 py-16 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No consent forms yet. Create one to start collecting signatures.
          </p>
          <Button
            className="mt-4"
            size="sm"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Create Form
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {forms.map((form) => {
            const aud = AUDIENCE_LABELS[form.audience] ?? AUDIENCE_LABELS.all;
            const AudienceIcon = aud.icon;
            return (
              <Card key={form.id} className="relative">
                <CardContent className="p-5">
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{form.title}</h3>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <AudienceIcon className="h-3.5 w-3.5" />
                        <span>{aud.label}</span>
                        <span className="text-muted-foreground/50">|</span>
                        <span
                          className={
                            form.status === "published"
                              ? "text-green-600 dark:text-green-400"
                              : "text-yellow-600 dark:text-yellow-400"
                          }
                        >
                          {form.status === "published" ? "Published" : "Draft"}
                        </span>
                      </div>
                    </div>
                  </div>
                  {form.description && (
                    <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                      {form.description}
                    </p>
                  )}
                  <div className="mb-4 text-sm">
                    <span className="font-medium">{form.submissionCount}</span>{" "}
                    <span className="text-muted-foreground">
                      {form.submissionCount === 1 ? "submission" : "submissions"}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() =>
                        router.push(
                          `/events/${eventId}/consent-forms/${form.id}`
                        )
                      }
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(form.id, form.title)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {forms.length >= 2 && (
        <p className="text-center text-xs text-muted-foreground">
          Maximum of 2 forms per event reached.
        </p>
      )}

      {/* Create Form Modal */}
      {showCreateModal && (
        <ModalOverlay onClose={() => setShowCreateModal(false)}>
          <div className="w-full max-w-lg rounded-xl bg-background p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">Create a Consent Form</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Choose a template or start from scratch.
            </p>

            <div className="space-y-2">
              {TEMPLATE_OPTIONS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => handleCreate(t.key)}
                  disabled={isPending}
                  className="flex w-full items-center justify-between rounded-lg border p-3 text-left hover:bg-muted/50 disabled:opacity-50"
                >
                  <div>
                    <p className="text-sm font-medium">{t.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.audience}
                    </p>
                  </div>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}

              <button
                type="button"
                onClick={() => handleCreate()}
                disabled={isPending}
                className="flex w-full items-center justify-between rounded-lg border border-dashed p-3 text-left hover:bg-muted/50 disabled:opacity-50"
              >
                <div>
                  <p className="text-sm font-medium">Start from scratch</p>
                  <p className="text-xs text-muted-foreground">
                    Build your own form
                  </p>
                </div>
                <Plus className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {confirmDialog}
    </div>
  );
}
```

**Step 2: Create the organizer page**

Replace the file at `apps/web/src/app/(organizer)/events/[eventId]/release-consent-forms/page.tsx`:

```typescript
import { getConsentForms, getSubmissionCount } from "@/features/consent-forms/queries";
import { ConsentFormsPageClient } from "@/features/consent-forms/components/consent-forms-page-client";

export default async function ConsentFormsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const forms = await getConsentForms(eventId);

  const formsWithCounts = await Promise.all(
    forms.map(async (form) => ({
      ...form,
      submissionCount: await getSubmissionCount(form.id),
    }))
  );

  return (
    <ConsentFormsPageClient eventId={eventId} forms={formsWithCounts} />
  );
}
```

**Step 3: Update the volunteer consent-forms page to redirect**

Replace `apps/web/src/app/(organizer)/events/[eventId]/volunteers/consent-forms/page.tsx`:

```typescript
import { redirect } from "next/navigation";

export default async function VolunteerConsentFormsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  redirect(`/events/${eventId}/release-consent-forms`);
}
```

**Step 4: Update the speakers consent-forms page to redirect**

Replace `apps/web/src/app/(organizer)/events/[eventId]/speakers/consent-forms/page.tsx`:

```typescript
import { redirect } from "next/navigation";

export default async function SpeakerConsentFormsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  redirect(`/events/${eventId}/release-consent-forms`);
}
```

**Step 5: Commit**

```bash
git add apps/web/src/features/consent-forms/components/consent-forms-page-client.tsx \
  apps/web/src/app/(organizer)/events/[eventId]/release-consent-forms/page.tsx \
  apps/web/src/app/(organizer)/events/[eventId]/volunteers/consent-forms/page.tsx \
  apps/web/src/app/(organizer)/events/[eventId]/speakers/consent-forms/page.tsx
git commit -m "feat: add consent forms list page with template picker"
```

---

### Task 5: Form Detail Page (Builder + Submissions)

**Files:**
- Create: `apps/web/src/features/consent-forms/components/form-detail-client.tsx`
- Create: `apps/web/src/features/consent-forms/components/form-builder.tsx`
- Create: `apps/web/src/features/consent-forms/components/form-settings.tsx`
- Create: `apps/web/src/features/consent-forms/components/submissions-table.tsx`
- Create: `apps/web/src/app/(organizer)/events/[eventId]/release-consent-forms/[formId]/page.tsx`

**Step 1: Create FormSettings component**

```typescript
"use client";

import { useState, useTransition } from "react";
import { Button, Input } from "@attendly/ui/components";
import { toast } from "sonner";
import { Copy, Link as LinkIcon } from "lucide-react";
import { updateConsentForm } from "../actions";
import type { ConsentForm } from "../queries";

interface FormSettingsProps {
  eventId: string;
  form: ConsentForm;
  formUrl: string;
}

export function FormSettings({ eventId, form, formUrl }: FormSettingsProps) {
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(form.title);
  const [description, setDescription] = useState(form.description ?? "");
  const [audience, setAudience] = useState(form.audience);
  const [requireCheckin, setRequireCheckin] = useState(
    form.require_before_checkin
  );

  function handleSave() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    startTransition(async () => {
      try {
        await updateConsentForm(eventId, form.id, {
          title: title.trim(),
          description: description.trim() || null,
          audience,
          require_before_checkin: requireCheckin,
        });
        toast.success("Settings saved");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  function handlePublishToggle() {
    const newStatus = form.status === "published" ? "draft" : "published";
    startTransition(async () => {
      try {
        await updateConsentForm(eventId, form.id, { status: newStatus });
        toast.success(
          newStatus === "published" ? "Form published" : "Form unpublished"
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update");
      }
    });
  }

  function copyLink() {
    navigator.clipboard.writeText(formUrl);
    toast.success("Link copied to clipboard");
  }

  return (
    <div className="space-y-6">
      {/* Publish Toggle + Link */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant={form.status === "published" ? "outline" : "default"}
          onClick={handlePublishToggle}
          disabled={isPending}
        >
          {form.status === "published" ? "Unpublish" : "Publish"}
        </Button>
        {form.status === "published" && (
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
            <LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <code className="truncate text-xs">{formUrl}</code>
            <Button variant="ghost" size="sm" onClick={copyLink}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Settings Fields */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Liability Waiver"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Audience</label>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value as any)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="all">Everyone</option>
            <option value="attendees">Attendees</option>
            <option value="speakers">Speakers</option>
            <option value="volunteers">Volunteers</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Description (optional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief introduction shown at the top of the form..."
          rows={3}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={requireCheckin}
          onChange={(e) => setRequireCheckin(e.target.checked)}
          className="rounded border"
        />
        Require completion before check-in
      </label>

      <Button onClick={handleSave} disabled={isPending}>
        {isPending ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}
```

**Step 2: Create FormBuilder component**

```typescript
"use client";

import { useState, useTransition } from "react";
import {
  Button,
  Input,
  ModalOverlay,
} from "@attendly/ui/components";
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Pencil,
  AlignLeft,
  CheckSquare,
  Type,
  FileText,
  PenTool,
} from "lucide-react";
import { toast } from "sonner";
import { useConfirm } from "@/shared/hooks/use-confirm";
import {
  createElement,
  updateElement,
  deleteElement,
  reorderElements,
} from "../actions";
import type { ConsentFormElement } from "../queries";

interface FormBuilderProps {
  eventId: string;
  formId: string;
  elements: ConsentFormElement[];
}

const ELEMENT_TYPE_CONFIG = {
  description: { label: "Description", icon: AlignLeft, color: "text-blue-500" },
  checkbox: { label: "Checkbox", icon: CheckSquare, color: "text-green-500" },
  text: { label: "Text Field", icon: Type, color: "text-orange-500" },
  textarea: { label: "Text Area", icon: FileText, color: "text-purple-500" },
  signature: { label: "Signature", icon: PenTool, color: "text-red-500" },
} as const;

export function FormBuilder({
  eventId,
  formId,
  elements,
}: FormBuilderProps) {
  const [isPending, startTransition] = useTransition();
  const { confirm, dialog: confirmDialog } = useConfirm();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingElement, setEditingElement] = useState<ConsentFormElement | null>(
    null
  );
  const [newType, setNewType] = useState<ConsentFormElement["type"]>("checkbox");
  const [label, setLabel] = useState("");
  const [isRequired, setIsRequired] = useState(true);

  const hasSignature = elements.some((e) => e.type === "signature");

  function openAddModal() {
    setEditingElement(null);
    setNewType("checkbox");
    setLabel("");
    setIsRequired(true);
    setShowAddModal(true);
  }

  function openEditModal(element: ConsentFormElement) {
    setEditingElement(element);
    setNewType(element.type);
    setLabel(element.label);
    setIsRequired(element.is_required);
    setShowAddModal(true);
  }

  function handleSaveElement() {
    if (!label.trim()) {
      toast.error("Label is required");
      return;
    }
    startTransition(async () => {
      try {
        if (editingElement) {
          await updateElement(eventId, editingElement.id, {
            label: label.trim(),
            is_required: isRequired,
          });
          toast.success("Element updated");
        } else {
          await createElement(eventId, formId, {
            type: newType,
            label: label.trim(),
            is_required: isRequired,
          });
          toast.success("Element added");
        }
        setShowAddModal(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  async function handleDelete(elementId: string) {
    const ok = await confirm({
      title: "Delete Element",
      description: "Are you sure you want to remove this element?",
      confirmText: "Delete",
      variant: "destructive",
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await deleteElement(eventId, elementId);
        toast.success("Element removed");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  }

  function handleMove(index: number, direction: "up" | "down") {
    const newOrder = [...elements];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newOrder.length) return;
    [newOrder[index], newOrder[swapIndex]] = [
      newOrder[swapIndex],
      newOrder[index],
    ];
    startTransition(async () => {
      try {
        await reorderElements(
          eventId,
          formId,
          newOrder.map((e) => e.id)
        );
      } catch (err) {
        toast.error("Failed to reorder");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Form Elements</h3>
        <Button size="sm" onClick={openAddModal} disabled={isPending}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add Element
        </Button>
      </div>

      {elements.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/20 py-8 text-center text-sm text-muted-foreground">
          No elements yet. Add elements to build your form.
        </div>
      ) : (
        <div className="space-y-2">
          {elements.map((element, i) => {
            const config = ELEMENT_TYPE_CONFIG[element.type];
            const Icon = config.icon;
            return (
              <div
                key={element.id}
                className="flex items-start gap-3 rounded-lg border p-3"
              >
                <Icon
                  className={`mt-0.5 h-4 w-4 shrink-0 ${config.color}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium uppercase text-muted-foreground">
                      {config.label}
                    </span>
                    {element.is_required && (
                      <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm line-clamp-2">{element.label}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMove(i, "up")}
                    disabled={i === 0 || isPending}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMove(i, "down")}
                    disabled={i === elements.length - 1 || isPending}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(element)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(element.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!hasSignature && (
        <p className="text-xs text-yellow-600 dark:text-yellow-400">
          Tip: Add a Signature element so signers can provide their legal name.
        </p>
      )}

      {/* Add/Edit Element Modal */}
      {showAddModal && (
        <ModalOverlay onClose={() => setShowAddModal(false)}>
          <div className="w-full max-w-md rounded-xl bg-background p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold">
              {editingElement ? "Edit Element" : "Add Element"}
            </h3>

            {!editingElement && (
              <div className="mb-4">
                <label className="mb-1 block text-sm font-medium">Type</label>
                <select
                  value={newType}
                  onChange={(e) =>
                    setNewType(e.target.value as ConsentFormElement["type"])
                  }
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="description">Description (read-only text)</option>
                  <option value="checkbox">Checkbox (acknowledgment)</option>
                  <option value="text">Text Field (short answer)</option>
                  <option value="textarea">Text Area (long answer)</option>
                  {!hasSignature && (
                    <option value="signature">Signature (typed name)</option>
                  )}
                </select>
              </div>
            )}

            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium">
                {newType === "description" ? "Content" : "Label"}
              </label>
              <textarea
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={
                  newType === "description"
                    ? "Enter the waiver/policy text..."
                    : newType === "checkbox"
                      ? 'e.g., "I agree to the terms above"'
                      : newType === "signature"
                        ? "e.g., Full Legal Name"
                        : "e.g., Emergency Contact Name"
                }
                rows={newType === "description" ? 6 : 2}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>

            {newType !== "description" && (
              <label className="mb-4 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isRequired}
                  onChange={(e) => setIsRequired(e.target.checked)}
                  className="rounded border"
                />
                Required
              </label>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveElement} disabled={isPending}>
                {isPending ? "Saving..." : editingElement ? "Update" : "Add"}
              </Button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {confirmDialog}
    </div>
  );
}
```

**Step 3: Create SubmissionsTable component**

```typescript
"use client";

import { useState, useTransition } from "react";
import { Button } from "@attendly/ui/components";
import { Send, Download, Bell } from "lucide-react";
import { toast } from "sonner";
import {
  sendConsentFormEmails,
  sendConsentFormReminders,
  exportSubmissionsCsv,
} from "../actions";
import type { ConsentFormSubmission } from "../queries";

interface SubmissionsTableProps {
  eventId: string;
  formId: string;
  submissions: ConsentFormSubmission[];
  formStatus: string;
}

export function SubmissionsTable({
  eventId,
  formId,
  submissions,
  formStatus,
}: SubmissionsTableProps) {
  const [isPending, startTransition] = useTransition();

  function handleSendForm() {
    startTransition(async () => {
      try {
        const count = await sendConsentFormEmails(eventId, formId);
        if (count === 0) {
          toast.info("All targeted participants have already signed");
        } else {
          toast.success(`Form sent to ${count} participants`);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to send");
      }
    });
  }

  function handleSendReminders() {
    startTransition(async () => {
      try {
        const count = await sendConsentFormReminders(eventId, formId);
        if (count === 0) {
          toast.info("No unsigned participants to remind");
        } else {
          toast.success(`Reminders sent to ${count} participants`);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to send");
      }
    });
  }

  function handleExport() {
    startTransition(async () => {
      try {
        const csv = await exportSubmissionsCsv(eventId, formId);
        if (!csv) {
          toast.info("No submissions to export");
          return;
        }
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `consent-form-submissions.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("CSV exported");
      } catch (err) {
        toast.error("Failed to export");
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          size="sm"
          onClick={handleSendForm}
          disabled={isPending || formStatus !== "published"}
        >
          <Send className="mr-1 h-3.5 w-3.5" />
          Send Form
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSendReminders}
          disabled={isPending || formStatus !== "published"}
        >
          <Bell className="mr-1 h-3.5 w-3.5" />
          Send Reminders
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={isPending || submissions.length === 0}
        >
          <Download className="mr-1 h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="rounded-lg bg-muted/30 p-4 text-center">
        <p className="text-3xl font-bold">{submissions.length}</p>
        <p className="text-sm text-muted-foreground">Total Submissions</p>
      </div>

      {/* Table */}
      {submissions.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 py-8 text-center text-sm text-muted-foreground">
          No submissions yet.
          {formStatus === "published"
            ? " Send the form to start collecting signatures."
            : " Publish the form first, then send it to participants."}
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">
                  Email
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  Signed Name
                </th>
                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">
                  Signed
                </th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub) => (
                <tr
                  key={sub.id}
                  className="border-b last:border-b-0 hover:bg-muted/20"
                >
                  <td className="px-4 py-3">{sub.name}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    {sub.email}
                  </td>
                  <td className="px-4 py-3 italic">{sub.signed_name}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {new Date(sub.signed_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

**Step 4: Create FormDetailClient component**

```typescript
"use client";

import { useState } from "react";
import { Hammer, ClipboardList } from "lucide-react";
import { FormBuilder } from "./form-builder";
import { FormSettings } from "./form-settings";
import { SubmissionsTable } from "./submissions-table";
import type { ConsentForm, ConsentFormElement, ConsentFormSubmission } from "../queries";

interface FormDetailClientProps {
  eventId: string;
  form: ConsentForm;
  elements: ConsentFormElement[];
  submissions: ConsentFormSubmission[];
  formUrl: string;
}

const tabs = [
  { key: "builder" as const, label: "Builder", icon: Hammer },
  { key: "submissions" as const, label: "Submissions", icon: ClipboardList },
];

export function FormDetailClient({
  eventId,
  form,
  elements,
  submissions,
  formUrl,
}: FormDetailClientProps) {
  const [currentTab, setCurrentTab] = useState<"builder" | "submissions">(
    "builder"
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{form.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage form content, settings, and view submissions.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setCurrentTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              currentTab === tab.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.key === "submissions" && submissions.length > 0 && (
              <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                {submissions.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {currentTab === "builder" && (
        <div className="space-y-8">
          <FormSettings eventId={eventId} form={form} formUrl={formUrl} />
          <hr />
          <FormBuilder eventId={eventId} formId={form.id} elements={elements} />
        </div>
      )}

      {currentTab === "submissions" && (
        <SubmissionsTable
          eventId={eventId}
          formId={form.id}
          submissions={submissions}
          formStatus={form.status}
        />
      )}
    </div>
  );
}
```

**Step 5: Create the organizer detail page**

Create `apps/web/src/app/(organizer)/events/[eventId]/release-consent-forms/[formId]/page.tsx`:

```typescript
import { notFound } from "next/navigation";
import {
  getConsentForm,
  getConsentFormElements,
  getSubmissions,
} from "@/features/consent-forms/queries";
import { FormDetailClient } from "@/features/consent-forms/components/form-detail-client";
import { createClient } from "@attendly/ui/supabase/server";

export default async function ConsentFormDetailPage({
  params,
}: {
  params: Promise<{ eventId: string; formId: string }>;
}) {
  const { eventId, formId } = await params;

  const [form, elements, submissions] = await Promise.all([
    getConsentForm(formId),
    getConsentFormElements(formId),
    getSubmissions(formId),
  ]);

  if (!form || form.event_id !== eventId) notFound();

  // Build public form URL
  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("slug, organizations(slug)")
    .eq("id", eventId)
    .single();

  const orgSlug = (event as any)?.organizations?.slug ?? "";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const formUrl = `${baseUrl}/${orgSlug}/${event?.slug}/consent/${formId}`;

  return (
    <FormDetailClient
      eventId={eventId}
      form={form}
      elements={elements}
      submissions={submissions}
      formUrl={formUrl}
    />
  );
}
```

**Step 6: Commit**

```bash
git add apps/web/src/features/consent-forms/components/form-settings.tsx \
  apps/web/src/features/consent-forms/components/form-builder.tsx \
  apps/web/src/features/consent-forms/components/submissions-table.tsx \
  apps/web/src/features/consent-forms/components/form-detail-client.tsx \
  apps/web/src/app/(organizer)/events/[eventId]/release-consent-forms/[formId]/page.tsx
git commit -m "feat: add consent form detail page with builder and submissions"
```

---

### Task 6: Public Signing Form

**Files:**
- Create: `apps/web/src/features/consent-forms/components/public-consent-form.tsx`
- Create: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/consent/[formId]/page.tsx`

**Step 1: Create the public form component**

```typescript
"use client";

import { useState, useTransition } from "react";
import { Button, Input } from "@attendly/ui/components";
import { XCircle, CheckCircle2, PenTool } from "lucide-react";
import { submitConsentForm } from "../actions";
import type { ConsentFormElement } from "../queries";

interface PublicConsentFormProps {
  formId: string;
  title: string;
  description: string | null;
  elements: ConsentFormElement[];
  eventTitle: string;
  userEmail?: string | null;
  userName?: string | null;
}

export function PublicConsentForm({
  formId,
  title,
  description,
  elements,
  eventTitle,
  userEmail,
  userName,
}: PublicConsentFormProps) {
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [email, setEmail] = useState(userEmail ?? "");
  const [name, setName] = useState(userName ?? "");
  const [answers, setAnswers] = useState<Record<string, string | boolean>>({});
  const [signedName, setSignedName] = useState("");

  function updateAnswer(elementId: string, value: string | boolean) {
    setAnswers((prev) => ({ ...prev, [elementId]: value }));
  }

  function handleSubmit() {
    setFormError(null);

    if (!name.trim() || !email.trim()) {
      setFormError("Name and email are required.");
      return;
    }

    if (!email.includes("@")) {
      setFormError("Please enter a valid email address.");
      return;
    }

    // Validate required elements
    for (const el of elements) {
      if (!el.is_required || el.type === "description") continue;
      if (el.type === "signature") {
        if (!signedName.trim()) {
          setFormError("Please provide your signature (typed legal name).");
          return;
        }
        continue;
      }
      const val = answers[el.id];
      if (el.type === "checkbox" && val !== true) {
        setFormError(`Please acknowledge: "${el.label}"`);
        return;
      }
      if ((el.type === "text" || el.type === "textarea") && !String(val ?? "").trim()) {
        setFormError(`"${el.label}" is required.`);
        return;
      }
    }

    startTransition(async () => {
      const result = await submitConsentForm(formId, {
        email: email.trim(),
        name: name.trim(),
        signed_name: signedName.trim(),
        answers,
      });

      if (result.error) {
        if ((result as any).alreadySigned) {
          setSubmitted(true);
        } else {
          setFormError(result.error);
        }
      } else {
        setSubmitted(true);
      }
    });
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-green-500" />
        <h2 className="mb-2 text-xl font-semibold">Form Submitted</h2>
        <p className="text-muted-foreground">
          Thank you — your form has been submitted successfully.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      {/* Header */}
      <div>
        <p className="text-sm text-muted-foreground">{eventTitle}</p>
        <h1 className="mt-1 text-2xl font-bold">{title}</h1>
        {description && (
          <p className="mt-2 text-muted-foreground">{description}</p>
        )}
      </div>

      {/* Signer Info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Full Name <span className="text-destructive">*</span>
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">
            Email <span className="text-destructive">*</span>
          </label>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            type="email"
          />
        </div>
      </div>

      <hr />

      {/* Form Elements */}
      <div className="space-y-6">
        {elements.map((element) => {
          if (element.type === "description") {
            return (
              <div
                key={element.id}
                className="whitespace-pre-wrap rounded-lg bg-muted/30 p-4 text-sm leading-relaxed"
              >
                {element.label}
              </div>
            );
          }

          if (element.type === "checkbox") {
            return (
              <label
                key={element.id}
                className="flex items-start gap-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/20"
              >
                <input
                  type="checkbox"
                  checked={answers[element.id] === true}
                  onChange={(e) =>
                    updateAnswer(element.id, e.target.checked)
                  }
                  className="mt-0.5 rounded border"
                />
                <span className="text-sm">
                  {element.label}
                  {element.is_required && (
                    <span className="text-destructive"> *</span>
                  )}
                </span>
              </label>
            );
          }

          if (element.type === "text") {
            return (
              <div key={element.id}>
                <label className="mb-1 block text-sm font-medium">
                  {element.label}
                  {element.is_required && (
                    <span className="text-destructive"> *</span>
                  )}
                </label>
                <Input
                  value={String(answers[element.id] ?? "")}
                  onChange={(e) => updateAnswer(element.id, e.target.value)}
                />
              </div>
            );
          }

          if (element.type === "textarea") {
            return (
              <div key={element.id}>
                <label className="mb-1 block text-sm font-medium">
                  {element.label}
                  {element.is_required && (
                    <span className="text-destructive"> *</span>
                  )}
                </label>
                <textarea
                  value={String(answers[element.id] ?? "")}
                  onChange={(e) => updateAnswer(element.id, e.target.value)}
                  rows={3}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>
            );
          }

          if (element.type === "signature") {
            return (
              <div key={element.id} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <PenTool className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Signature</span>
                  <span className="text-destructive">*</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Type your full legal name below to sign this form.
                </p>
                <Input
                  value={signedName}
                  onChange={(e) => setSignedName(e.target.value)}
                  placeholder="Full Legal Name"
                  className="text-lg italic"
                />
                <p className="text-xs text-muted-foreground">
                  Date: {new Date().toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            );
          }

          return null;
        })}
      </div>

      {/* Error */}
      {formError && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={isPending}
        className="w-full"
        size="lg"
      >
        {isPending ? "Submitting..." : "Sign & Submit"}
      </Button>
    </div>
  );
}
```

**Step 2: Create the public page**

Create `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/consent/[formId]/page.tsx`:

```typescript
import { notFound } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/server";
import { getPublicConsentForm } from "@/features/consent-forms/queries";
import { PublicConsentForm } from "@/features/consent-forms/components/public-consent-form";

export default async function PublicConsentFormPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string; formId: string }>;
}) {
  const { orgSlug, eventSlug, formId } = await params;
  const supabase = await createClient();

  // Resolve org
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .single();

  if (!org) notFound();

  // Resolve event
  const { data: event } = await supabase
    .from("events")
    .select("id, title")
    .eq("slug", eventSlug)
    .eq("organization_id", org.id)
    .single();

  if (!event) notFound();

  // Get published form + elements
  const formData = await getPublicConsentForm(formId);
  if (!formData) notFound();

  // Verify form belongs to this event
  if (formData.form.event_id !== event.id) notFound();

  // Get user info for pre-fill
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userEmail: string | null = null;
  let userName: string | null = null;

  if (user) {
    userEmail = user.email ?? null;
    const { data: reg } = await supabase
      .from("registrations")
      .select("attendee_profiles(first_name, last_name)")
      .eq("event_id", event.id)
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (reg) {
      const profile = (reg as any).attendee_profiles?.[0];
      if (profile) {
        userName = `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || null;
      }
    }
  }

  return (
    <PublicConsentForm
      formId={formId}
      title={formData.form.title}
      description={formData.form.description}
      elements={formData.elements}
      eventTitle={event.title}
      userEmail={userEmail}
      userName={userName}
    />
  );
}
```

**Step 3: Commit**

```bash
git add apps/web/src/features/consent-forms/components/public-consent-form.tsx \
  apps/web/src/app/(public)/[orgSlug]/[eventSlug]/consent/[formId]/page.tsx
git commit -m "feat: add public consent form signing page"
```

---

### Task 7: Check-in Enforcement

**Files:**
- Modify: `apps/web/src/features/registration/components/kiosk-mode.tsx`

**Step 1: Add consent form check to kiosk check-in flow**

In `kiosk-mode.tsx`, after a successful check-in result, query for pending consent forms. If any exist, show a warning instead of the success screen.

Add import at the top:
```typescript
import { getPendingConsentForms } from "@/features/consent-forms/queries";
```

Add a new state variant to the KioskState type:
```typescript
| { mode: "consent_warning"; name: string; pendingForms: { id: string; title: string }[] }
```

In the `handleCheckInResult` function, after getting the result, add:
```typescript
// Check for pending consent forms
const pendingForms = await getPendingConsentForms(eventId, attendeeEmail);
if (pendingForms.length > 0) {
  setState({
    mode: "consent_warning",
    name: result.name,
    pendingForms,
  });
  return;
}
```

Add a render block for the `consent_warning` state:
```typescript
{state.mode === "consent_warning" && (
  <div className="text-center space-y-4">
    <div className="text-yellow-500 text-6xl">⚠️</div>
    <h3 className="text-xl font-bold">{state.name}</h3>
    <p className="text-muted-foreground">
      The following consent form(s) must be completed before check-in:
    </p>
    <ul className="text-sm space-y-1">
      {state.pendingForms.map((f) => (
        <li key={f.id} className="font-medium">{f.title}</li>
      ))}
    </ul>
    <Button onClick={() => setState({ mode: "idle" })}>
      Dismiss
    </Button>
  </div>
)}
```

**Note:** The exact integration depends on how the kiosk flow provides the attendee email. Read the full kiosk-mode.tsx and adapt accordingly. The key query is `getPendingConsentForms(eventId, email)`.

**Step 2: Commit**

```bash
git add apps/web/src/features/registration/components/kiosk-mode.tsx
git commit -m "feat: add consent form enforcement to kiosk check-in"
```

---

### Task 8: Sidebar Navigation Update

**Files:**
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/layout.tsx`

**Step 1: Update sidebar navigation**

The sidebar already has three links:
1. `/events/${eventId}/speakers/consent-forms` (under Speaker Center)
2. `/events/${eventId}/volunteers/consent-forms` (under Call for Volunteers)
3. `/events/${eventId}/release-consent-forms` (standalone under Attendees)

Since Tasks 4 already set up the volunteer and speaker pages to redirect to the main page, no sidebar changes are needed — all three links will work and route to the correct destination.

Verify the existing links point correctly by reading the layout file. If the standalone link uses a different icon or label, update to match:

```typescript
{ href: `/events/${eventId}/release-consent-forms`, label: "Release & Consent Forms", icon: "file-signature" },
```

**Step 2: Commit (if changes needed)**

```bash
git add apps/web/src/app/(organizer)/events/[eventId]/layout.tsx
git commit -m "feat: update sidebar navigation for consent forms"
```

---

### Task 9: TypeScript Verification & Cleanup

**Step 1: Run TypeScript check**

Run: `cd apps/web && npx tsc --noEmit 2>&1 | head -50`
Expected: No new errors from our changes.

**Step 2: Fix any type errors**

Address any TypeScript errors in the new files.

**Step 3: Commit fixes**

```bash
git add -A
git commit -m "fix: resolve TypeScript errors in consent-forms feature"
```

---

### Task 10: Manual Smoke Test

**Step 1: Verify organizer list page**

1. Navigate to `/events/{eventId}/release-consent-forms`
2. Verify empty state shows
3. Click "Create Form" → template modal opens
4. Select a template → redirects to form detail page

**Step 2: Verify form builder**

1. On detail page, verify template elements loaded
2. Add a new element → appears in list
3. Reorder elements → order updates
4. Edit element → modal pre-fills values
5. Delete element → confirm dialog → element removed

**Step 3: Verify form settings**

1. Change title, audience, description → save → persists on reload
2. Toggle publish → status changes
3. Copy link button → copies URL

**Step 4: Verify public form**

1. Navigate to the public URL
2. Fill out all fields
3. Submit → see confirmation
4. Try submitting again with same email → see "already signed" message

**Step 5: Verify submissions table**

1. Back on organizer detail page → Submissions tab
2. Verify the submission appears
3. Test CSV export → downloads file with correct data

**Step 6: Verify redirects**

1. Navigate to `/events/{eventId}/volunteers/consent-forms` → redirects to main page
2. Navigate to `/events/{eventId}/speakers/consent-forms` → redirects to main page

**Step 7: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during smoke testing"
```

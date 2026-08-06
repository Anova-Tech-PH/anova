# Organizer Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 9 organizer features (CSV export already exists) to make Attendly competitive with Eventbrite, Luma, Splash, and Hopin.

**Architecture:** Each feature follows the existing feature module pattern (`src/features/{name}/actions.ts`, `queries.ts`, `components/`). Database changes use incremental Supabase migrations applied via `npx supabase migration up`. Server actions for mutations, server components for data fetching.

**Tech Stack:** Next.js 16, React 19, Supabase (PostgreSQL + RLS), TypeScript, Tailwind 4, Resend (emails), lucide-react (icons), sonner (toasts)

**Conventions:**
- Route groups: `(organizer)` for dashboard, `(public)` for attendee-facing
- UI imports: `@attendly/ui/components` for Button, Card, Badge, Input, Textarea, etc.
- Supabase client: `@attendly/ui/supabase/server` (server), `@attendly/ui/supabase/client` (client)
- Migrations: `packages/supabase/migrations/` — numbered sequentially (next is 020)
- **Never** use `supabase db reset` — always use `npx supabase migration up`

---

## Feature 1: CSV Export
**Status: ALREADY IMPLEMENTED** — `registrations-table.tsx:93-115` has full CSV export with Download button.

---

## Feature 2: Event Duplication

**Goal:** One-click clone of an event + its ticket types, tracks, sessions, speakers, and session-speaker assignments. Creates a new draft event.

### Task 2.1: Create server action for event duplication

**Files:**
- Modify: `apps/web/src/features/events/actions.ts`

**Step 1: Add `duplicateEvent` server action**

Add to `apps/web/src/features/events/actions.ts`:

```typescript
"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function duplicateEvent(eventId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  // 1. Fetch original event
  const { data: event, error: eventErr } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (eventErr || !event) throw new Error("Event not found");

  // Verify org membership
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", event.organization_id)
    .eq("user_id", user.id)
    .single();

  if (!membership) throw new Error("Not authorized");

  // 2. Insert cloned event
  const { data: newEvent, error: insertErr } = await supabase
    .from("events")
    .insert({
      organization_id: event.organization_id,
      title: `${event.title} (Copy)`,
      slug: `${event.slug}-copy-${Date.now()}`,
      description: event.description,
      start_date: event.start_date,
      end_date: event.end_date,
      timezone: event.timezone,
      venue_name: event.venue_name,
      venue_address: event.venue_address,
      is_virtual: event.is_virtual,
      virtual_url: event.virtual_url,
      cover_image: event.cover_image,
      status: "draft",
      theme: event.theme,
      settings: event.settings,
    })
    .select("id")
    .single();

  if (insertErr || !newEvent) throw new Error(insertErr?.message ?? "Failed to create event");

  const newEventId = newEvent.id;

  // 3. Clone ticket types
  const { data: tickets } = await supabase
    .from("ticket_types")
    .select("*")
    .eq("event_id", eventId);

  if (tickets?.length) {
    await supabase.from("ticket_types").insert(
      tickets.map((t) => ({
        event_id: newEventId,
        name: t.name,
        description: t.description,
        type: t.type,
        price: t.price,
        quantity: t.quantity,
        sort_order: t.sort_order,
      }))
    );
  }

  // 4. Clone tracks (need ID mapping for sessions)
  const { data: tracks } = await supabase
    .from("tracks")
    .select("*")
    .eq("event_id", eventId);

  const trackIdMap: Record<string, string> = {};
  if (tracks?.length) {
    for (const track of tracks) {
      const { data: newTrack } = await supabase
        .from("tracks")
        .insert({
          event_id: newEventId,
          name: track.name,
          color: track.color,
          sort_order: track.sort_order,
        })
        .select("id")
        .single();
      if (newTrack) trackIdMap[track.id] = newTrack.id;
    }
  }

  // 5. Clone speakers (need ID mapping for session_speakers)
  const { data: speakers } = await supabase
    .from("speakers")
    .select("*")
    .eq("event_id", eventId);

  const speakerIdMap: Record<string, string> = {};
  if (speakers?.length) {
    for (const speaker of speakers) {
      const { data: newSpeaker } = await supabase
        .from("speakers")
        .insert({
          event_id: newEventId,
          name: speaker.name,
          title: speaker.title,
          company: speaker.company,
          bio: speaker.bio,
          photo: speaker.photo,
          email: speaker.email,
        })
        .select("id")
        .single();
      if (newSpeaker) speakerIdMap[speaker.id] = newSpeaker.id;
    }
  }

  // 6. Clone sessions (need ID mapping for session_speakers)
  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .eq("event_id", eventId);

  const sessionIdMap: Record<string, string> = {};
  if (sessions?.length) {
    for (const session of sessions) {
      const { data: newSession } = await supabase
        .from("sessions")
        .insert({
          event_id: newEventId,
          track_id: session.track_id ? trackIdMap[session.track_id] ?? null : null,
          title: session.title,
          description: session.description,
          type: session.type,
          start_time: session.start_time,
          end_time: session.end_time,
          location: session.location,
          enable_check_in: session.enable_check_in,
        })
        .select("id")
        .single();
      if (newSession) sessionIdMap[session.id] = newSession.id;
    }
  }

  // 7. Clone session-speaker assignments
  const { data: sessionSpeakers } = await supabase
    .from("session_speakers")
    .select("*")
    .in("session_id", Object.keys(sessionIdMap));

  if (sessionSpeakers?.length) {
    const mappedAssignments = sessionSpeakers
      .filter((ss) => sessionIdMap[ss.session_id] && speakerIdMap[ss.speaker_id])
      .map((ss) => ({
        session_id: sessionIdMap[ss.session_id],
        speaker_id: speakerIdMap[ss.speaker_id],
      }));
    if (mappedAssignments.length) {
      await supabase.from("session_speakers").insert(mappedAssignments);
    }
  }

  revalidatePath("/events");
  return { id: newEventId };
}
```

**Step 2: Verify it compiles**
Run: `cd /Users/bertwinromero/Documents/billionsoulharves-workspace/attendly && pnpm exec tsc --noEmit --project apps/web/tsconfig.json 2>&1 | head -20`

**Step 3: Commit**
```bash
git add apps/web/src/features/events/actions.ts
git commit -m "feat: add duplicateEvent server action"
```

### Task 2.2: Add Duplicate button to event settings page

**Files:**
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/settings/settings-form.tsx`

**Step 1: Add duplicate button between Publishing and Danger Zone sections**

Import `Copy` from lucide-react and `duplicateEvent` from features. Add a new Card section:

```tsx
// Add to imports
import { Copy } from "lucide-react";
import { duplicateEvent } from "@/features/events/actions";

// Add state
const [duplicating, setDuplicating] = useState(false);

// Add handler
async function handleDuplicate() {
  setDuplicating(true);
  try {
    const result = await duplicateEvent(event.id);
    toast.success("Event duplicated!");
    router.push(`/events/${result.id}/settings`);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Failed to duplicate");
  } finally {
    setDuplicating(false);
  }
}

// Add JSX between Publishing card and Danger Zone
<Card className="p-6">
  <h2 className="mb-2 text-lg font-semibold">Duplicate Event</h2>
  <p className="text-sm text-muted-foreground">
    Create a copy of this event with all tickets, sessions, speakers, and tracks. The copy will be created as a draft.
  </p>
  <Button
    variant="outline"
    onClick={handleDuplicate}
    loading={duplicating}
    className="mt-4 gap-2"
  >
    <Copy className="h-4 w-4" />
    {duplicating ? "Duplicating..." : "Duplicate Event"}
  </Button>
</Card>
```

**Step 2: Test in browser**
Navigate to an event's settings page, click "Duplicate Event", verify redirect to new event.

**Step 3: Commit**
```bash
git add apps/web/src/app/(organizer)/events/[eventId]/settings/settings-form.tsx
git commit -m "feat: add Duplicate Event button to settings page"
```

---

## Feature 3: Custom Registration Fields

**Goal:** Let organizers define custom form fields (text, select, checkbox, textarea) per event that appear during registration. Data saved in `registrations.custom_fields` JSONB column (already exists).

### Task 3.1: Create migration for custom_registration_fields table

**Files:**
- Create: `packages/supabase/migrations/020_custom_registration_fields.sql`

**Step 1: Write migration**

```sql
-- Custom registration fields defined per event
CREATE TABLE public.custom_registration_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  field_key TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'textarea', 'select', 'checkbox', 'number', 'date')),
  required BOOLEAN NOT NULL DEFAULT false,
  options JSONB DEFAULT '[]', -- for select type: ["Option A", "Option B"]
  placeholder TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, field_key)
);

ALTER TABLE public.custom_registration_fields ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.custom_registration_fields TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_registration_fields TO authenticated;

-- Public can view fields for published events (needed for registration form)
CREATE POLICY "Fields visible for published events"
  ON public.custom_registration_fields FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = custom_registration_fields.event_id
      AND (events.status = 'published' OR public.is_org_member(events.organization_id))
  ));

-- Editors can manage fields
CREATE POLICY "Editors can manage custom fields"
  ON public.custom_registration_fields FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = custom_registration_fields.event_id
      AND public.is_org_member(events.organization_id, 'editor')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = custom_registration_fields.event_id
      AND public.is_org_member(events.organization_id, 'editor')
  ));

CREATE INDEX idx_custom_reg_fields_event ON public.custom_registration_fields(event_id);
```

**Step 2: Apply migration**
Run: `cd /Users/bertwinromero/Documents/billionsoulharves-workspace/attendly && npx supabase migration up`

**Step 3: Commit**
```bash
git add packages/supabase/migrations/020_custom_registration_fields.sql
git commit -m "feat: add custom_registration_fields table"
```

### Task 3.2: Create feature module for custom fields

**Files:**
- Create: `apps/web/src/features/custom-fields/queries.ts`
- Create: `apps/web/src/features/custom-fields/actions.ts`

**Step 1: Write queries**

```typescript
// queries.ts
import { createClient } from "@attendly/ui/supabase/server";

export type CustomField = {
  id: string;
  event_id: string;
  label: string;
  field_key: string;
  type: string;
  required: boolean;
  options: string[];
  placeholder: string | null;
  sort_order: number;
};

export async function getCustomFieldsByEvent(eventId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("custom_registration_fields")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order");

  if (error) throw new Error(error.message);
  return data as CustomField[];
}
```

**Step 2: Write actions**

```typescript
// actions.ts
"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function createCustomField(eventId: string, data: {
  label: string;
  field_key: string;
  type: string;
  required?: boolean;
  options?: string[];
  placeholder?: string;
}) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("custom_registration_fields")
    .select("sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const sortOrder = existing?.[0] ? existing[0].sort_order + 1 : 0;

  const { data: field, error } = await supabase
    .from("custom_registration_fields")
    .insert({
      event_id: eventId,
      label: data.label,
      field_key: data.field_key,
      type: data.type,
      required: data.required ?? false,
      options: data.options ?? [],
      placeholder: data.placeholder ?? null,
      sort_order: sortOrder,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}`);
  return field;
}

export async function updateCustomField(eventId: string, fieldId: string, data: {
  label?: string;
  type?: string;
  required?: boolean;
  options?: string[];
  placeholder?: string;
}) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("custom_registration_fields")
    .update(data)
    .eq("id", fieldId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}`);
}

export async function deleteCustomField(eventId: string, fieldId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("custom_registration_fields")
    .delete()
    .eq("id", fieldId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}`);
}
```

**Step 3: Commit**
```bash
git add apps/web/src/features/custom-fields/
git commit -m "feat: add custom fields queries and actions"
```

### Task 3.3: Create organizer UI for managing custom fields

**Files:**
- Create: `apps/web/src/features/custom-fields/components/custom-fields-manager.tsx`
- Create: `apps/web/src/app/(organizer)/events/[eventId]/custom-fields/page.tsx`
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/layout.tsx` — add tab

**Step 1: Build the custom fields manager component**

A list of existing fields with add/edit/delete. Each field shows: label, type, required badge. An "Add Field" form with label, key (auto-generated from label), type dropdown, required toggle, options (for select type), placeholder.

**Step 2: Create the page**

Server component that fetches fields and renders `CustomFieldsManager`.

**Step 3: Add tab to event layout**

Add `{ href: '/events/${eventId}/custom-fields', label: 'Form Fields', icon: ListChecks }` to the tabs array (import `ListChecks` from lucide-react). Place it after "Tickets".

**Step 4: Commit**

### Task 3.4: Render custom fields in public registration form

**Files:**
- Modify: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/register/page.tsx` — fetch custom fields
- Modify: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/register/registration-flow.tsx` — render dynamic fields

**Step 1:** In the register page, fetch custom fields alongside tickets and pass them to `RegistrationFlow`.

**Step 2:** In `RegistrationFlow`, replace the hardcoded gender/birthday/address/city/country fields with dynamic rendering based on custom fields. Map field types to appropriate inputs. Collect values in a `customValues` state object and pass to `registerForEvent` as `custom_fields`.

**Step 3: Commit**

### Task 3.5: Also clone custom fields during event duplication

**Files:**
- Modify: `apps/web/src/features/events/actions.ts` — add custom fields to `duplicateEvent`

**Step 1:** After cloning speakers, add:
```typescript
// 8. Clone custom registration fields
const { data: customFields } = await supabase
  .from("custom_registration_fields")
  .select("*")
  .eq("event_id", eventId);

if (customFields?.length) {
  await supabase.from("custom_registration_fields").insert(
    customFields.map((f) => ({
      event_id: newEventId,
      label: f.label,
      field_key: f.field_key,
      type: f.type,
      required: f.required,
      options: f.options,
      placeholder: f.placeholder,
      sort_order: f.sort_order,
    }))
  );
}
```

**Step 2: Commit**

---

## Feature 4: Discount/Promo Codes

**Goal:** Organizers create codes that give percentage or flat discounts on paid tickets, with optional usage limits and expiry dates.

### Task 4.1: Create migration for promo_codes table

**Files:**
- Create: `packages/supabase/migrations/021_promo_codes.sql`

```sql
CREATE TABLE public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(10, 2) NOT NULL,
  max_uses INT, -- NULL = unlimited
  current_uses INT NOT NULL DEFAULT 0,
  applies_to UUID[] DEFAULT '{}', -- empty = all ticket types, otherwise specific ticket_type IDs
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, code)
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.promo_codes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_codes TO authenticated;

-- Public can check codes for published events (to validate during registration)
CREATE POLICY "Codes readable for published events"
  ON public.promo_codes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = promo_codes.event_id
      AND (events.status = 'published' OR public.is_org_member(events.organization_id))
  ));

-- Editors can manage codes
CREATE POLICY "Editors can manage promo codes"
  ON public.promo_codes FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = promo_codes.event_id
      AND public.is_org_member(events.organization_id, 'editor')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = promo_codes.event_id
      AND public.is_org_member(events.organization_id, 'editor')
  ));

-- Add promo_code_id to registrations for tracking
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES public.promo_codes(id) ON DELETE SET NULL;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0;

CREATE INDEX idx_promo_codes_event ON public.promo_codes(event_id);
CREATE INDEX idx_promo_codes_code ON public.promo_codes(event_id, code);
```

**Step 1: Apply migration**
Run: `npx supabase migration up`

**Step 2: Commit**

### Task 4.2: Create promo codes feature module

**Files:**
- Create: `apps/web/src/features/promo-codes/queries.ts`
- Create: `apps/web/src/features/promo-codes/actions.ts`

Actions: `createPromoCode`, `updatePromoCode`, `deletePromoCode`, `validatePromoCode` (public-facing, checks active, not expired, not maxed out, returns discount info).

### Task 4.3: Create organizer UI for managing promo codes

**Files:**
- Create: `apps/web/src/features/promo-codes/components/promo-code-manager.tsx`
- Create: `apps/web/src/app/(organizer)/events/[eventId]/promo-codes/page.tsx`
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/layout.tsx` — add "Promo Codes" tab with `Tag` icon

### Task 4.4: Add promo code input to registration flow

**Files:**
- Modify: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/register/registration-flow.tsx`

Add a "Have a promo code?" collapsible section. On apply, call `validatePromoCode` server action, display discounted price. Pass `promo_code_id` and `discount_amount` to registration.

### Task 4.5: Update registration action to handle promo codes

**Files:**
- Modify: `apps/web/src/features/registration/actions.ts`

In `registerForEvent`: accept optional `promo_code_id`, validate the code server-side, increment `current_uses`, save `promo_code_id` and `discount_amount` on the registration.

---

## Feature 5: Co-hosts / Team Roles

**Goal:** Invite other users by email to help manage events. Roles: admin, editor, check-in (new), viewer. Uses existing `organization_members` table + `is_org_member()` function.

### Task 5.1: Add 'check_in' role to organization_members

**Files:**
- Create: `packages/supabase/migrations/022_check_in_role.sql`

```sql
-- Expand role check constraint to include 'check_in'
ALTER TABLE public.organization_members DROP CONSTRAINT organization_members_role_check;
ALTER TABLE public.organization_members ADD CONSTRAINT organization_members_role_check
  CHECK (role IN ('owner', 'admin', 'editor', 'check_in', 'viewer'));

-- Update is_org_member to rank 'check_in' between viewer and editor
CREATE OR REPLACE FUNCTION public.is_org_member(
  _org_id uuid,
  _min_role text default 'viewer'
) RETURNS boolean AS $$
DECLARE
  _user_role text;
  _role_rank int;
  _min_rank int;
BEGIN
  SELECT role INTO _user_role
  FROM public.organization_members
  WHERE organization_id = _org_id
    AND user_id = auth.uid();

  IF _user_role IS NULL THEN
    RETURN false;
  END IF;

  _role_rank := CASE _user_role
    WHEN 'owner' THEN 5
    WHEN 'admin' THEN 4
    WHEN 'editor' THEN 3
    WHEN 'check_in' THEN 2
    WHEN 'viewer' THEN 1
    ELSE 0
  END;

  _min_rank := CASE _min_role
    WHEN 'owner' THEN 5
    WHEN 'admin' THEN 4
    WHEN 'editor' THEN 3
    WHEN 'check_in' THEN 2
    WHEN 'viewer' THEN 1
    ELSE 0
  END;

  RETURN _role_rank >= _min_rank;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
```

### Task 5.2: Create team management UI

**Files:**
- Create: `apps/web/src/features/team/queries.ts`
- Create: `apps/web/src/features/team/actions.ts` — `inviteTeamMember(orgId, email, role)`, `updateMemberRole`, `removeMember`
- Create: `apps/web/src/features/team/components/team-manager.tsx`
- Modify: `apps/web/src/app/(organizer)/settings/page.tsx` — add Team section or create separate page

The invite flow: look up user by email in `auth.users`, if found add to `organization_members`. If not found, show "User not found — they need to sign up first" (invitation-by-email with magic link can come later).

---

## Feature 6: Post-Event Survey

**Goal:** Auto-send a survey link to attendees after event ends. Organizer defines questions, attendees fill out form, organizer sees results.

### Task 6.1: Create migration for surveys

**Files:**
- Create: `packages/supabase/migrations/023_surveys.sql`

```sql
CREATE TABLE public.surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Post-Event Feedback',
  questions JSONB NOT NULL DEFAULT '[]',
  -- questions format: [{ "id": "q1", "label": "...", "type": "rating|text|select", "options": [...], "required": true }]
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id) -- one survey per event for now
);

CREATE TABLE public.survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  registration_id UUID REFERENCES public.registrations(id) ON DELETE SET NULL,
  respondent_email TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}', -- { "q1": 5, "q2": "Great event!" }
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(survey_id, respondent_email)
);

-- RLS, grants, indexes...
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.surveys TO authenticated;
GRANT SELECT, INSERT ON public.survey_responses TO anon;
GRANT SELECT, INSERT ON public.survey_responses TO authenticated;

CREATE POLICY "Org members can manage surveys" ON public.surveys FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM events WHERE events.id = surveys.event_id AND is_org_member(events.organization_id, 'editor')))
  WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = surveys.event_id AND is_org_member(events.organization_id, 'editor')));

CREATE POLICY "Survey viewable for published events" ON public.surveys FOR SELECT
  USING (active AND EXISTS (SELECT 1 FROM events WHERE events.id = surveys.event_id AND events.status IN ('published', 'completed')));

CREATE POLICY "Anyone can submit survey responses" ON public.survey_responses FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM surveys WHERE surveys.id = survey_responses.survey_id AND surveys.active));

CREATE POLICY "Org members can view responses" ON public.survey_responses FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM surveys s JOIN events e ON e.id = s.event_id
    WHERE s.id = survey_responses.survey_id AND is_org_member(e.organization_id)
  ));
```

### Task 6.2: Create survey feature module (queries, actions, components)

- Organizer survey builder: add questions with type (rating 1-5, text, select)
- Public survey form: `/[orgSlug]/[eventSlug]/feedback` page
- Organizer results view: aggregate ratings, list text responses

### Task 6.3: Wire post_event email automation to include survey link

Modify the existing `post_event` email template to include a link to the survey page.

---

## Feature 7: Approval Workflow

**Goal:** Organizer can require manual approval for registrations. Registration status starts as "pending" instead of "confirmed".

### Task 7.1: Add approval settings to events

**Files:**
- Create: `packages/supabase/migrations/024_approval_workflow.sql`

```sql
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS require_approval BOOLEAN NOT NULL DEFAULT false;
```

### Task 7.2: Modify registration action

**Files:**
- Modify: `apps/web/src/features/registration/actions.ts`

In `registerForEvent`: check `event.require_approval`. If true, set status to `"pending"` instead of `"confirmed"`. Send a different email (pending notification instead of confirmation).

### Task 7.3: Add approval UI to registrations table

**Files:**
- Modify: `apps/web/src/features/registration/components/registrations-table.tsx`

Add "Approve" and "Reject" buttons for pending registrations (use existing `updateRegistrationStatus` action). Add a "Pending" filter option.

### Task 7.4: Add toggle in event settings

**Files:**
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/settings/settings-form.tsx`

Add "Require approval for registrations" checkbox toggle in the General section.

---

## Feature 8: Event Templates

**Goal:** Save an event configuration as a reusable template. Create new events from templates.

### Task 8.1: Create migration for event_templates

**Files:**
- Create: `packages/supabase/migrations/025_event_templates.sql`

```sql
CREATE TABLE public.event_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL DEFAULT '{}',
  -- template_data stores: { event fields, ticket_types[], tracks[], custom_fields[] }
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.event_templates ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_templates TO authenticated;

CREATE POLICY "Org members can manage templates" ON public.event_templates FOR ALL TO authenticated
  USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));
```

### Task 8.2: Create template feature module

- `saveAsTemplate(eventId, name)` — reads event + ticket types + tracks + custom fields, saves as JSONB
- `createEventFromTemplate(templateId, overrides)` — creates event + related records from template
- Template picker in the "New Event" page

### Task 8.3: Add "Save as Template" button to event settings

---

## Feature 9: Attendee Certificate Generation

**Goal:** Generate PDF certificates with attendee name, event title, date. Downloadable by organizer or attendee.

### Task 9.1: Install PDF generation library

Run: `cd apps/web && pnpm add @react-pdf/renderer`

### Task 9.2: Create certificate template component

**Files:**
- Create: `apps/web/src/features/certificates/components/certificate-template.tsx`

React PDF component with event title, attendee name, date, organization name.

### Task 9.3: Create certificate download API route

**Files:**
- Create: `apps/web/src/app/api/certificates/[registrationId]/route.ts`

GET handler that fetches registration + event data, renders PDF, returns as download.

### Task 9.4: Add download button to registrations table and attendee-facing page

---

## Feature 10: Revenue Dashboard

**Goal:** Show ticket sales over time, revenue by ticket type, total revenue. Only relevant for events with paid tickets.

### Task 10.1: Create revenue queries

**Files:**
- Create: `apps/web/src/features/dashboard/revenue-queries.ts`

Queries: total revenue per event (sum of ticket prices for confirmed+checked_in registrations minus discounts), revenue by ticket type, daily registration trend.

### Task 10.2: Create revenue dashboard component

**Files:**
- Create: `apps/web/src/features/dashboard/components/revenue-charts.tsx`

Bar chart for revenue by ticket type, line chart for daily sales trend, summary cards (total revenue, average ticket price, paid vs free ratio).

### Task 10.3: Add revenue section to analytics page

**Files:**
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/analytics/page.tsx`

Fetch revenue data and render `RevenueCharts` below existing `AnalyticsCharts`.

---

## Implementation Order Summary

| # | Feature | Migration | New Files | Modified Files |
|---|---------|-----------|-----------|----------------|
| 1 | CSV Export | — | — | — (already done) |
| 2 | Event Duplication | — | — | `events/actions.ts`, `settings-form.tsx` |
| 3 | Custom Registration Fields | 020 | feature module + page | `layout.tsx`, `registration-flow.tsx`, `register/page.tsx` |
| 4 | Discount/Promo Codes | 021 | feature module + page | `layout.tsx`, `registration-flow.tsx`, `registration/actions.ts` |
| 5 | Co-hosts / Team Roles | 022 | feature module + page | `settings/page.tsx` |
| 6 | Post-Event Survey | 023 | feature module + pages | email template |
| 7 | Approval Workflow | 024 | — | `registration/actions.ts`, `settings-form.tsx`, `registrations-table.tsx` |
| 8 | Event Templates | 025 | feature module + page | `events/new/page.tsx`, `settings-form.tsx` |
| 9 | Certificates | — (npm) | feature module + API route | `registrations-table.tsx` |
| 10 | Revenue Dashboard | — | queries + component | `analytics/page.tsx` |

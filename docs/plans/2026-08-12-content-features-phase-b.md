# Phase B: Business & Operations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement Logistics Page, Exhibitor/Sponsor Center, and Event Website Builder for full Whova parity.

**Architecture:** Three features built incrementally — Logistics (smallest, extends events table), Sponsors (largest, 7 new tables with virtual booths + real-time chat), Website Builder (JSONB config + section renderer). Each follows the feature module pattern: `src/features/{name}/actions.ts`, `queries.ts`, `components/`, with tests collocated.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind 4, Supabase (PostgreSQL + RLS + Realtime), Vitest, sonner toasts, lucide-react icons.

**Design doc:** `docs/plans/2026-08-12-content-features-design.md` (sections B1, B2, B3)

---

## Task 1: Logistics Migration (040)

**Files:**
- Create: `packages/supabase/migrations/040_logistics.sql`

**Step 1: Write migration**

```sql
-- =============================================================================
-- Logistics Page
-- Extends events table with venue details and logistics JSONB config
-- =============================================================================

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS venue_description TEXT,
  ADD COLUMN IF NOT EXISTS venue_map_url TEXT,
  ADD COLUMN IF NOT EXISTS logistics JSONB NOT NULL DEFAULT '{}';

-- No new RLS needed — events table already has policies
-- No new grants needed — events table already has grants
```

**Step 2: Apply migration**

```bash
docker exec -i supabase_db_attendly psql -U postgres -d postgres < packages/supabase/migrations/040_logistics.sql
```

Expected: No errors.

**Step 3: Commit**

```bash
git add packages/supabase/migrations/040_logistics.sql
git commit -m "feat: add logistics columns to events table (migration 040)"
```

---

## Task 2: Logistics Feature Module

**Files:**
- Create: `apps/web/src/features/logistics/actions.ts`
- Create: `apps/web/src/features/logistics/queries.ts`
- Create: `apps/web/src/features/logistics/actions.test.ts`

**Step 1: Write queries.ts**

```typescript
import { createClient } from "@attendly/ui/supabase/server";

export type Hotel = {
  name: string;
  url: string;
  distance: string;
  rate: string;
};

export type Contact = {
  name: string;
  phone: string;
  email: string;
};

export type CustomSection = {
  title: string;
  body: string;
};

export type LogisticsData = {
  parking: { title: string; body: string } | null;
  hotels: Hotel[];
  transportation: { title: string; body: string } | null;
  wifi: { network: string; password: string } | null;
  contacts: Contact[];
  custom_sections: CustomSection[];
};

export type EventLogistics = {
  venue_description: string | null;
  venue_map_url: string | null;
  logistics: LogisticsData;
};

export async function getEventLogistics(eventId: string): Promise<EventLogistics> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select("venue_description, venue_map_url, logistics")
    .eq("id", eventId)
    .single();

  if (error) throw new Error(error.message);

  const logistics = (data.logistics ?? {}) as Partial<LogisticsData>;

  return {
    venue_description: data.venue_description ?? null,
    venue_map_url: data.venue_map_url ?? null,
    logistics: {
      parking: logistics.parking ?? null,
      hotels: logistics.hotels ?? [],
      transportation: logistics.transportation ?? null,
      wifi: logistics.wifi ?? null,
      contacts: logistics.contacts ?? [],
      custom_sections: logistics.custom_sections ?? [],
    },
  };
}
```

**Step 2: Write actions.ts**

```typescript
"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";
import type { LogisticsData } from "./queries";

export async function updateLogistics(
  eventId: string,
  data: {
    venue_description?: string | null;
    venue_map_url?: string | null;
    logistics?: Partial<LogisticsData>;
  }
) {
  const supabase = await createClient();

  // If logistics partial provided, merge with existing
  let logisticsUpdate = undefined;
  if (data.logistics) {
    const { data: existing, error: fetchErr } = await supabase
      .from("events")
      .select("logistics")
      .eq("id", eventId)
      .single();

    if (fetchErr) throw new Error(fetchErr.message);

    logisticsUpdate = { ...(existing.logistics ?? {}), ...data.logistics };
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (data.venue_description !== undefined) updatePayload.venue_description = data.venue_description;
  if (data.venue_map_url !== undefined) updatePayload.venue_map_url = data.venue_map_url;
  if (logisticsUpdate) updatePayload.logistics = logisticsUpdate;

  const { error } = await supabase
    .from("events")
    .update(updatePayload)
    .eq("id", eventId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/logistics`);
}
```

**Step 3: Write actions.test.ts**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { revalidatePath } from "next/cache";

function createQueryMock(result: { data?: unknown; error?: unknown }) {
  const handler: ProxyHandler<object> = {
    get(_target, prop: string) {
      if (prop === "then") return (resolve: (v: unknown) => void) => resolve(result);
      return vi.fn(() => new Proxy({}, handler));
    },
  };
  return new Proxy({}, handler);
}

const mockFrom = vi.fn();

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ from: mockFrom })),
}));

describe("Logistics Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("updateLogistics", () => {
    it("updates venue fields and revalidates", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: null, error: null })
      );

      const { updateLogistics } = await import("./actions");
      await updateLogistics("evt-1", {
        venue_description: "Convention Center",
        venue_map_url: "https://maps.google.com/...",
      });

      expect(mockFrom).toHaveBeenCalledWith("events");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/logistics");
    });

    it("merges logistics JSONB with existing data", async () => {
      // First call returns existing logistics (for the fetch)
      // Second call returns null (for the update)
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return createQueryMock({
            data: { logistics: { parking: { title: "Parking", body: "Lot A" } } },
            error: null,
          });
        }
        return createQueryMock({ data: null, error: null });
      });

      const { updateLogistics } = await import("./actions");
      await updateLogistics("evt-1", {
        logistics: { wifi: { network: "EventWiFi", password: "pass123" } },
      });

      expect(mockFrom).toHaveBeenCalledWith("events");
      expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/logistics");
    });
  });
});
```

**Step 4: Run tests**

```bash
cd apps/web && npx vitest run src/features/logistics/actions.test.ts
```

**Step 5: Commit**

```bash
git add apps/web/src/features/logistics/
git commit -m "feat: add logistics feature module with actions, queries, and tests"
```

---

## Task 3: Logistics Organizer UI

**Files:**
- Create: `apps/web/src/features/logistics/components/logistics-editor.tsx`
- Create: `apps/web/src/app/(organizer)/events/[eventId]/logistics/page.tsx`
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/layout.tsx` — add sidebar link

**Step 1: Create logistics-editor.tsx**

A "use client" component with sections for:
- Venue description (textarea) + map URL (input)
- Parking info (title + body)
- Transportation info (title + body)
- WiFi info (network + password)
- Hotels list (add/remove rows: name, url, distance, rate)
- Contacts list (add/remove rows: name, phone, email)
- Custom sections (add/remove: title + body)
- Save button that calls `updateLogistics`

Use `@attendly/ui/components` for Button, Input, Textarea, Card.
Follow the same client component patterns as `document-list.tsx` — local state, toast on success/error.

**Step 2: Create organizer page**

```typescript
import { getEventLogistics } from "@/features/logistics/queries";
import { LogisticsEditor } from "@/features/logistics/components/logistics-editor";

export default async function LogisticsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const logistics = await getEventLogistics(eventId);

  return <LogisticsEditor eventId={eventId} initialData={logistics} />;
}
```

**Step 3: Add sidebar link**

In `layout.tsx`, add to the "Event Setup" group (after Documents):

```typescript
{ href: `/events/${eventId}/logistics`, label: "Logistics", icon: "clipboard-list" },
```

The `clipboard-list` icon is already in the `iconMap` in `event-sub-sidebar.tsx`.

**Step 4: Verify in browser**

Navigate to `/events/{eventId}/logistics`. Should render the form with empty defaults.

**Step 5: Commit**

```bash
git add apps/web/src/features/logistics/components/ apps/web/src/app/\(organizer\)/events/\[eventId\]/logistics/ apps/web/src/app/\(organizer\)/events/\[eventId\]/layout.tsx
git commit -m "feat: add logistics organizer page with editor UI"
```

---

## Task 4: Logistics Public Page

**Files:**
- Create: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/logistics/page.tsx`
- Modify: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/event-nav.tsx` — add nav link

**Step 1: Create public logistics page**

Follow the public page pattern from `resources/page.tsx`:
1. Lookup org by slug → event by slug + status published
2. Fetch `venue_description`, `venue_map_url`, `logistics` from events
3. Render sections conditionally (only show non-empty sections):
   - Venue info + embedded map iframe (if Google Maps URL)
   - Parking section
   - Transportation section
   - WiFi card (network name + password with copy button)
   - Recommended Hotels table
   - Emergency/Help Contacts
   - Custom sections

**Step 2: Add public nav link**

In `event-nav.tsx`, add to `navItems` array (before Register):

```typescript
{ label: "Logistics", path: "/logistics", icon: ClipboardList },
```

Add `ClipboardList` to the imports from `lucide-react`.

**Step 3: Commit**

```bash
git add apps/web/src/app/\(public\)/\[orgSlug\]/\[eventSlug\]/logistics/ apps/web/src/app/\(public\)/\[orgSlug\]/\[eventSlug\]/event-nav.tsx
git commit -m "feat: add public logistics page with venue, transport, hotels, wifi info"
```

---

## Task 5: Sponsors Migration (041)

**Files:**
- Create: `packages/supabase/migrations/041_sponsors.sql`

**Step 1: Write migration**

Create all 7 tables from the design doc with RLS, grants, indexes:

```sql
-- =============================================================================
-- Exhibitor/Sponsor Center
-- Sponsor tiers, sponsors, documents, coupons, leads, booth chat, visits
-- =============================================================================

-- Tier management
CREATE TABLE public.sponsor_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  logo_size TEXT DEFAULT 'medium' CHECK (logo_size IN ('large', 'medium', 'small')),
  benefits JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sponsors
CREATE TABLE public.sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  tier_id UUID REFERENCES public.sponsor_tiers(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  logo TEXT,
  description TEXT,
  website_url TEXT,
  promo_video_url TEXT,
  booth_enabled BOOLEAN DEFAULT false,
  contact_email TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sponsor documents (brochures, one-pagers)
CREATE TABLE public.sponsor_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID NOT NULL REFERENCES public.sponsors(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sponsor coupons
CREATE TABLE public.sponsor_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID NOT NULL REFERENCES public.sponsors(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT,
  discount_value NUMERIC NOT NULL,
  discount_type TEXT DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  valid_until TIMESTAMPTZ,
  max_uses INT,
  current_uses INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lead capture
CREATE TABLE public.sponsor_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID NOT NULL REFERENCES public.sponsors(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  job_title TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sponsor_id, user_id)
);

-- Booth real-time chat
CREATE TABLE public.booth_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID NOT NULL REFERENCES public.sponsors(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_from_sponsor BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Booth visit tracking
CREATE TABLE public.booth_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID NOT NULL REFERENCES public.sponsors(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sponsor_id, user_id)
);

-- Indexes
CREATE INDEX idx_sponsor_tiers_event ON public.sponsor_tiers(event_id);
CREATE INDEX idx_sponsors_event ON public.sponsors(event_id);
CREATE INDEX idx_sponsors_tier ON public.sponsors(tier_id);
CREATE INDEX idx_sponsor_documents_sponsor ON public.sponsor_documents(sponsor_id);
CREATE INDEX idx_sponsor_coupons_sponsor ON public.sponsor_coupons(sponsor_id);
CREATE INDEX idx_sponsor_leads_sponsor ON public.sponsor_leads(sponsor_id);
CREATE INDEX idx_sponsor_leads_user ON public.sponsor_leads(user_id);
CREATE INDEX idx_booth_messages_sponsor ON public.booth_messages(sponsor_id);
CREATE INDEX idx_booth_messages_event ON public.booth_messages(event_id);
CREATE INDEX idx_booth_visits_sponsor ON public.booth_visits(sponsor_id);

-- Enable RLS
ALTER TABLE public.sponsor_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booth_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booth_visits ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT ON public.sponsor_tiers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsor_tiers TO authenticated;
GRANT ALL ON public.sponsor_tiers TO service_role;

GRANT SELECT ON public.sponsors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsors TO authenticated;
GRANT ALL ON public.sponsors TO service_role;

GRANT SELECT ON public.sponsor_documents TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsor_documents TO authenticated;
GRANT ALL ON public.sponsor_documents TO service_role;

GRANT SELECT ON public.sponsor_coupons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsor_coupons TO authenticated;
GRANT ALL ON public.sponsor_coupons TO service_role;

GRANT SELECT, INSERT ON public.sponsor_leads TO authenticated;
GRANT ALL ON public.sponsor_leads TO service_role;

GRANT SELECT, INSERT ON public.booth_messages TO authenticated;
GRANT ALL ON public.booth_messages TO service_role;

GRANT SELECT, INSERT ON public.booth_visits TO authenticated;
GRANT ALL ON public.booth_visits TO service_role;

-- RLS Policies: sponsor_tiers
CREATE POLICY "Anyone can view tiers for published events"
  ON public.sponsor_tiers FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM events e WHERE e.id = sponsor_tiers.event_id AND e.status = 'published'
  ));

CREATE POLICY "Authenticated can view tiers"
  ON public.sponsor_tiers FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e WHERE e.id = sponsor_tiers.event_id
    AND (e.status = 'published' OR is_org_member(e.organization_id))
  ));

CREATE POLICY "Org members can manage tiers"
  ON public.sponsor_tiers FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e WHERE e.id = sponsor_tiers.event_id AND is_org_member(e.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM events e WHERE e.id = sponsor_tiers.event_id AND is_org_member(e.organization_id)
  ));

-- RLS Policies: sponsors (same pattern as tiers)
CREATE POLICY "Anyone can view sponsors for published events"
  ON public.sponsors FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM events e WHERE e.id = sponsors.event_id AND e.status = 'published'
  ));

CREATE POLICY "Authenticated can view sponsors"
  ON public.sponsors FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e WHERE e.id = sponsors.event_id
    AND (e.status = 'published' OR is_org_member(e.organization_id))
  ));

CREATE POLICY "Org members can manage sponsors"
  ON public.sponsors FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e WHERE e.id = sponsors.event_id AND is_org_member(e.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM events e WHERE e.id = sponsors.event_id AND is_org_member(e.organization_id)
  ));

-- RLS Policies: sponsor_documents (public read, org member write)
CREATE POLICY "Anyone can view sponsor documents"
  ON public.sponsor_documents FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM sponsors s JOIN events e ON e.id = s.event_id
    WHERE s.id = sponsor_documents.sponsor_id AND e.status = 'published'
  ));

CREATE POLICY "Authenticated can view sponsor documents"
  ON public.sponsor_documents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM sponsors s WHERE s.id = sponsor_documents.sponsor_id));

CREATE POLICY "Org members can manage sponsor documents"
  ON public.sponsor_documents FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sponsors s JOIN events e ON e.id = s.event_id
    WHERE s.id = sponsor_documents.sponsor_id AND is_org_member(e.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM sponsors s JOIN events e ON e.id = s.event_id
    WHERE s.id = sponsor_documents.sponsor_id AND is_org_member(e.organization_id)
  ));

-- RLS Policies: sponsor_coupons (same as documents)
CREATE POLICY "Anyone can view sponsor coupons"
  ON public.sponsor_coupons FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM sponsors s JOIN events e ON e.id = s.event_id
    WHERE s.id = sponsor_coupons.sponsor_id AND e.status = 'published'
  ));

CREATE POLICY "Authenticated can view sponsor coupons"
  ON public.sponsor_coupons FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM sponsors s WHERE s.id = sponsor_coupons.sponsor_id));

CREATE POLICY "Org members can manage sponsor coupons"
  ON public.sponsor_coupons FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sponsors s JOIN events e ON e.id = s.event_id
    WHERE s.id = sponsor_coupons.sponsor_id AND is_org_member(e.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM sponsors s JOIN events e ON e.id = s.event_id
    WHERE s.id = sponsor_coupons.sponsor_id AND is_org_member(e.organization_id)
  ));

-- RLS Policies: sponsor_leads
CREATE POLICY "Users can submit their own lead"
  ON public.sponsor_leads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own leads"
  ON public.sponsor_leads FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Org members can view all leads for their events"
  ON public.sponsor_leads FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e WHERE e.id = sponsor_leads.event_id AND is_org_member(e.organization_id)
  ));

-- RLS Policies: booth_messages
CREATE POLICY "Authenticated users can send booth messages"
  ON public.booth_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read messages in booths they participate in"
  ON public.booth_messages FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM sponsors s JOIN events e ON e.id = s.event_id
      WHERE s.id = booth_messages.sponsor_id AND is_org_member(e.organization_id)
    )
  );

-- RLS Policies: booth_visits
CREATE POLICY "Users can record own visits"
  ON public.booth_visits FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Org members can view visit stats"
  ON public.booth_visits FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sponsors s JOIN events e ON e.id = s.event_id
    WHERE s.id = booth_visits.sponsor_id AND is_org_member(e.organization_id)
  ));

-- Enable Realtime for booth chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.booth_messages;
```

**Step 2: Apply migration**

```bash
docker exec -i supabase_db_attendly psql -U postgres -d postgres < packages/supabase/migrations/041_sponsors.sql
```

**Step 3: Commit**

```bash
git add packages/supabase/migrations/041_sponsors.sql
git commit -m "feat: add sponsor center tables with RLS and realtime (migration 041)"
```

---

## Task 6: Sponsor Tiers Feature Module

**Files:**
- Create: `apps/web/src/features/sponsors/tier-actions.ts`
- Create: `apps/web/src/features/sponsors/tier-queries.ts`
- Create: `apps/web/src/features/sponsors/tier-actions.test.ts`

**Details:**
- `tier-queries.ts`: `getTiersByEvent(eventId)` — returns tiers ordered by sort_order
- `tier-actions.ts`: `createTier(eventId, data)`, `updateTier(eventId, tierId, data)`, `deleteTier(eventId, tierId)` — all revalidate `/events/${eventId}/sponsors`
- `tier-actions.test.ts`: Follow the `createQueryMock` pattern from documents tests

**Commit message:** `feat: add sponsor tier CRUD actions, queries, and tests`

---

## Task 7: Sponsor CRUD Feature Module

**Files:**
- Create: `apps/web/src/features/sponsors/actions.ts`
- Create: `apps/web/src/features/sponsors/queries.ts`
- Create: `apps/web/src/features/sponsors/actions.test.ts`

**Details:**

`queries.ts` exports:
- `getSponsorsByEvent(eventId)` — all sponsors with tier join, ordered by tier sort_order then sponsor sort_order
- `getSponsorById(sponsorId)` — single sponsor with tier, documents, coupons
- `getSponsorsByTier(eventId)` — grouped by tier for public listing
- `getSponsorLeads(sponsorId)` — all leads for a sponsor
- `getSponsorAnalytics(eventId)` — booth visits, lead counts, document downloads per sponsor

`actions.ts` exports:
- `createSponsor(eventId, data)` — insert sponsor with all fields
- `updateSponsor(eventId, sponsorId, data)` — update sponsor
- `deleteSponsor(eventId, sponsorId)` — delete with cascade
- `bulkImportSponsors(eventId, rows[])` — CSV import, 500 limit
- `createSponsorDocument(sponsorId, data)` — add brochure/file
- `deleteSponsorDocument(sponsorId, docId)` — remove file
- `createSponsorCoupon(sponsorId, data)` — add coupon
- `deleteSponsorCoupon(sponsorId, couponId)` — remove coupon
- `submitLead(sponsorId, eventId, data)` — attendee shares contact
- `sendBoothMessage(sponsorId, eventId, message)` — chat message
- `recordBoothVisit(sponsorId, eventId)` — upsert visit

All mutations revalidate `/events/${eventId}/sponsors`.

**Commit message:** `feat: add sponsor CRUD actions, queries, and tests`

---

## Task 8: Sponsor Organizer UI — Tier & Sponsor Management

**Files:**
- Create: `apps/web/src/features/sponsors/components/tier-manager.tsx`
- Create: `apps/web/src/features/sponsors/components/sponsor-form.tsx`
- Create: `apps/web/src/features/sponsors/components/sponsor-list.tsx`
- Create: `apps/web/src/app/(organizer)/events/[eventId]/sponsors/page.tsx`
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/layout.tsx` — add Sponsors sidebar group

**Details:**

`tier-manager.tsx`: Card-based tier list with add/edit/delete. Each tier shows name, logo size selector, benefits list. Follow `track-manager.tsx` pattern.

`sponsor-form.tsx`: Modal form with fields: name, logo URL, description, website, promo video URL, tier selector, booth enabled toggle, contact email, sort order. Follow `speaker-form.tsx` pattern.

`sponsor-list.tsx`: Table/card list of sponsors grouped by tier. Hover actions for edit/delete (always visible on mobile like documents). Each row shows logo, name, tier badge, booth status. Import CSV button for bulk import.

`page.tsx`: Server component that fetches tiers + sponsors, renders `TierManager` + `SponsorList`.

Sidebar: Add new group "Sponsors" with items:
```typescript
{
  label: "Sponsors",
  items: [
    { href: `/events/${eventId}/sponsors`, label: "Sponsors", icon: "award" },
  ],
},
```

**Commit message:** `feat: add sponsor organizer pages with tier and sponsor management UI`

---

## Task 9: Sponsor Organizer UI — Documents, Coupons, Leads, Analytics

**Files:**
- Create: `apps/web/src/features/sponsors/components/sponsor-detail-panel.tsx`
- Create: `apps/web/src/features/sponsors/components/sponsor-docs-manager.tsx`
- Create: `apps/web/src/features/sponsors/components/sponsor-coupons-manager.tsx`
- Create: `apps/web/src/features/sponsors/components/sponsor-leads-table.tsx`
- Create: `apps/web/src/features/sponsors/components/sponsor-analytics.tsx`
- Create: `apps/web/src/app/(organizer)/events/[eventId]/sponsors/[sponsorId]/page.tsx`

**Details:**

`sponsor-detail-panel.tsx`: Tabbed panel (Details | Documents | Coupons | Leads | Analytics) for managing a single sponsor. This is the main component on the sponsor detail page.

`sponsor-docs-manager.tsx`: CRUD for sponsor documents (brochures, one-pagers). Add form + list with delete.

`sponsor-coupons-manager.tsx`: CRUD for coupons. Fields: code, description, discount_value, discount_type, valid_until, max_uses. List with usage count.

`sponsor-leads-table.tsx`: Read-only table of captured leads with name, email, company, job title, date.

`sponsor-analytics.tsx`: Stats cards (total visits, total leads, total doc downloads) + simple bar/list breakdown per sponsor.

**Commit message:** `feat: add sponsor detail page with documents, coupons, leads, and analytics`

---

## Task 10: Public Sponsors Listing Page

**Files:**
- Create: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/sponsors/page.tsx`
- Modify: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/event-nav.tsx` — add Sponsors link

**Details:**

Follow public page pattern:
1. Org lookup → event lookup
2. Fetch sponsors grouped by tier using `getSponsorsByTier`
3. Render tier sections with tier name as heading
4. Logo grid sized by tier's `logo_size` (large/medium/small maps to grid column spans)
5. Each sponsor card: logo, name, short description, link to booth page
6. Cards link to `/[orgSlug]/[eventSlug]/sponsors/[sponsorId]`

Add to `event-nav.tsx` navItems (before Logistics):
```typescript
{ label: "Sponsors", path: "/sponsors", icon: Award },
```

**Commit message:** `feat: add public sponsors listing page grouped by tier`

---

## Task 11: Public Sponsor Booth Page

**Files:**
- Create: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/sponsors/[sponsorId]/page.tsx`
- Create: `apps/web/src/features/sponsors/components/booth-chat.tsx`
- Create: `apps/web/src/features/sponsors/components/lead-capture-button.tsx`
- Create: `apps/web/src/features/sponsors/components/coupon-display.tsx`

**Details:**

`page.tsx`: Server component that fetches sponsor with documents, coupons. Renders booth layout:
- Hero: logo + name + description
- Promo video embed (if URL provided, reuse `VideoEmbed` component)
- Documents section (download links)
- Coupons section (code + description + validity)
- "Share my contact" lead capture button
- Booth chat panel
- Records booth visit on page load

`booth-chat.tsx`: "use client" component with Supabase Realtime subscription on `booth_messages`. Shows message list + input field. Follow Q&A panel Realtime pattern — subscribe to INSERT events, append to local state. Messages show user initial + text + timestamp.

`lead-capture-button.tsx`: Button that calls `submitLead` server action. Shows confirmation dialog first ("Share your name and email with {sponsor}?"). Disabled after submission with "Contact shared" state.

`coupon-display.tsx`: Card showing coupon code (with click-to-copy), description, discount, validity date.

**Commit message:** `feat: add public sponsor booth page with chat, lead capture, and coupons`

---

## Task 12: Website Builder Migration (042)

**Files:**
- Create: `packages/supabase/migrations/042_website_builder.sql`

**Step 1: Write migration**

```sql
-- =============================================================================
-- Event Website Builder
-- Adds website_config JSONB to events for section-based page builder
-- =============================================================================

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS website_config JSONB NOT NULL DEFAULT '{
    "enabled": false,
    "sections": [
      { "type": "hero", "visible": true, "content": { "headline": "", "subtitle": "" } },
      { "type": "about", "visible": true, "content": { "body": "" } },
      { "type": "speakers", "visible": true, "content": { "title": "Featured Speakers", "featured_only": true } },
      { "type": "agenda", "visible": true, "content": { "title": "Schedule" } },
      { "type": "sponsors", "visible": true, "content": { "title": "Our Sponsors" } },
      { "type": "venue", "visible": true, "content": { "title": "Venue & Logistics" } },
      { "type": "faq", "visible": true, "content": { "items": [] } },
      { "type": "cta", "visible": true, "content": { "text": "Register Now", "button_text": "Get Tickets" } }
    ],
    "theme": { "primary_color": "#0ea5e9", "font": "Inter" },
    "custom_css": ""
  }';
```

**Step 2: Apply and commit**

```bash
docker exec -i supabase_db_attendly psql -U postgres -d postgres < packages/supabase/migrations/042_website_builder.sql
git add packages/supabase/migrations/042_website_builder.sql
git commit -m "feat: add website_config column to events (migration 042)"
```

---

## Task 13: Website Builder Feature Module

**Files:**
- Create: `apps/web/src/features/website/actions.ts`
- Create: `apps/web/src/features/website/queries.ts`
- Create: `apps/web/src/features/website/types.ts`
- Create: `apps/web/src/features/website/actions.test.ts`

**Details:**

`types.ts`: Shared types for WebsiteConfig, Section, Theme.

```typescript
export type SectionType = "hero" | "about" | "speakers" | "agenda" | "sponsors" | "venue" | "faq" | "cta";

export type Section = {
  type: SectionType;
  visible: boolean;
  content: Record<string, unknown>;
};

export type WebsiteTheme = {
  primary_color: string;
  font: string;
};

export type WebsiteConfig = {
  enabled: boolean;
  sections: Section[];
  theme: WebsiteTheme;
  custom_css: string;
};
```

`queries.ts`: `getWebsiteConfig(eventId)` returns typed WebsiteConfig.

`actions.ts`:
- `updateWebsiteConfig(eventId, config: Partial<WebsiteConfig>)` — merge and save
- `updateSection(eventId, sectionIndex: number, section: Section)` — update one section
- `reorderSections(eventId, orderedTypes: SectionType[])` — reorder sections array
- `toggleWebsite(eventId, enabled: boolean)` — enable/disable

All revalidate `/events/${eventId}/website`.

**Commit message:** `feat: add website builder feature module with actions, queries, and tests`

---

## Task 14: Website Builder Organizer UI

**Files:**
- Create: `apps/web/src/features/website/components/website-editor.tsx`
- Create: `apps/web/src/features/website/components/section-editor.tsx`
- Create: `apps/web/src/features/website/components/theme-picker.tsx`
- Create: `apps/web/src/app/(organizer)/events/[eventId]/website/page.tsx`
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/layout.tsx` — add sidebar link

**Details:**

`website-editor.tsx`: Main editor with:
- Enable/disable toggle at top
- Section list with visibility toggles and drag handles (use native HTML drag/drop or simple up/down buttons)
- Click section to expand inline editor
- Theme picker panel (primary color input + font dropdown)
- Custom CSS textarea
- "Preview" link that opens the public website page in new tab

`section-editor.tsx`: Per-section content editor. Switch on section type:
- `hero`: headline + subtitle inputs
- `about`: rich text body (textarea for now)
- `speakers`: title input + "featured only" checkbox
- `agenda`: title input
- `sponsors`: title input
- `venue`: title input (pulls from logistics data)
- `faq`: list of Q&A pairs with add/remove
- `cta`: text + button_text inputs

`theme-picker.tsx`: Color input + font select (Inter, System, Mono).

Sidebar: Add under "Outreach" group:
```typescript
{ href: `/events/${eventId}/website`, label: "Website", icon: "globe" },
```

The `globe` icon is already in `iconMap`.

**Commit message:** `feat: add website builder organizer UI with section and theme editors`

---

## Task 15: Public Website Page (Section Renderer)

**Files:**
- Create: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/website/page.tsx`
- Create: `apps/web/src/features/website/components/website-renderer.tsx`
- Create: `apps/web/src/features/website/components/sections/hero-section.tsx`
- Create: `apps/web/src/features/website/components/sections/about-section.tsx`
- Create: `apps/web/src/features/website/components/sections/speakers-section.tsx`
- Create: `apps/web/src/features/website/components/sections/agenda-section.tsx`
- Create: `apps/web/src/features/website/components/sections/sponsors-section.tsx`
- Create: `apps/web/src/features/website/components/sections/venue-section.tsx`
- Create: `apps/web/src/features/website/components/sections/faq-section.tsx`
- Create: `apps/web/src/features/website/components/sections/cta-section.tsx`

**Details:**

`page.tsx`: Server component that:
1. Fetches event with `website_config`
2. If `website_config.enabled` is false, show "Website not published" message
3. Fetches dynamic data needed by sections (speakers, sessions, sponsors, logistics)
4. Passes config + data to `WebsiteRenderer`

`website-renderer.tsx`: Iterates over `config.sections`, renders only visible sections in order. Applies theme CSS variables (primary color, font). Injects custom CSS in a `<style>` tag.

Each section component:
- `hero-section.tsx`: Full-width banner with headline, subtitle, gradient background using theme color
- `about-section.tsx`: Prose block with event description
- `speakers-section.tsx`: Speaker card grid (featured only if configured), pull from speakers data
- `agenda-section.tsx`: Compact schedule timeline, pull from sessions data
- `sponsors-section.tsx`: Sponsor logos grouped by tier, pull from sponsors data
- `venue-section.tsx`: Venue info + map, pull from logistics data
- `faq-section.tsx`: Accordion-style Q&A list from config content
- `cta-section.tsx`: Full-width CTA banner with register button linking to `/register`

**Commit message:** `feat: add public website page with configurable section renderer`

---

## Task 16: Navigation & Integration Cleanup

**Files:**
- Modify: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/event-nav.tsx` — add Website link
- Verify all sidebar links work
- Verify all public nav links work

**Details:**

Add Website to public nav (before Register):
```typescript
{ label: "Website", path: "/website", icon: Globe },
```

Run through all new pages in browser to verify no 404s or errors.

**Commit message:** `feat: finalize Phase B navigation links and integration`

---

## Task 17: Phase B Testing & UX Review

**Files:**
- Run all tests: `cd apps/web && npx vitest run`
- Playwright UI testing of all new pages
- Write UX report to `docs/ux-reports/YYYY-MM-DD-phase-b.md`

**Details:**

Test checklist:
- [ ] Logistics editor: save venue info, hotels, WiFi, contacts
- [ ] Public logistics page renders all sections
- [ ] Sponsor tier CRUD
- [ ] Sponsor CRUD with tier assignment
- [ ] Sponsor detail: documents, coupons, leads tabs
- [ ] Public sponsor listing grouped by tier
- [ ] Public booth page: chat, lead capture, coupons
- [ ] Website builder: enable/disable, edit sections, theme
- [ ] Public website renders configured sections
- [ ] All sidebar and public nav links work

**Commit message:** `test: Phase B content features UI testing and UX report`

---

## Summary

| Task | Feature | Size |
|------|---------|------|
| 1 | Logistics migration | Small |
| 2 | Logistics feature module | Small |
| 3 | Logistics organizer UI | Medium |
| 4 | Logistics public page | Medium |
| 5 | Sponsors migration | Large |
| 6 | Sponsor tiers module | Small |
| 7 | Sponsor CRUD module | Medium |
| 8 | Sponsor organizer UI | Large |
| 9 | Sponsor detail/analytics | Large |
| 10 | Public sponsors listing | Medium |
| 11 | Public sponsor booth | Large |
| 12 | Website builder migration | Small |
| 13 | Website builder module | Small |
| 14 | Website builder organizer UI | Large |
| 15 | Public website renderer | Large |
| 16 | Navigation cleanup | Small |
| 17 | Testing & UX review | Medium |

**Total: 17 tasks across 3 features**

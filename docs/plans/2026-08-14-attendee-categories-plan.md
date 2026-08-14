# Area B: Attendee Categories & Customization — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Use superpowers:test-driven-development for every task.

**Goal:** Replace freeform text categories with a proper relational model — defined categories with colors, ticket mapping, and a visibility matrix for the public attendee directory.

**Architecture:** New `attendee_categories` table with color/sort/visibility fields, `ticket_type_categories` join table (many-to-many ready, one-to-one enforced in UI), `category_visibility` matrix table for directory access control. Add `category_id` FK to `registrations`. Data migration converts existing freeform text categories. New management page under Attendees tab. Update all existing category consumers (attendees table, announcements, emails, CSV).

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase (PostgreSQL + RLS), Vitest, Server Actions, Tailwind 4

**Design doc:** `docs/plans/2026-08-14-attendee-categories-design.md`

---

## Reference: Codebase Patterns

**Migration pattern** (see `packages/supabase/migrations/064_ticket_addons.sql`):
- Table with UUID PK, `event_id` FK, timestamps
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
- `GRANT SELECT, INSERT, UPDATE, DELETE ON ... TO authenticated`
- RLS policies using `is_org_member(e.organization_id)` for org access
- Public read policy checking `e.status = 'published'`

**Feature module pattern** (see `src/features/ticket-addons/`):
- `queries.ts` — export type + async query functions using `createClient()` from `@attendly/ui/supabase/server`
- `actions.ts` — `"use server"` + auth check + validation + `revalidatePath()`
- `queries.test.ts` / `actions.test.ts` — Vitest with proxy-based Supabase mock
- `components/` — `"use client"` components with useState, toast, form handlers

**Test mock pattern** (see `src/features/ticket-addons/actions.test.ts`):
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

function createMockSupabase(overrides: Record<string, unknown> = {}) {
  const chainable = new Proxy(
    {},
    {
      get(_, prop) {
        if (prop in overrides) return overrides[prop];
        if (prop === "then") return undefined;
        return () => chainable;
      },
    }
  );
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
    from: vi.fn(() => chainable),
  };
}
```

**Page pattern** (see `src/app/(organizer)/events/[eventId]/ticket-addons/page.tsx`):
- Async server component, `await params`, `Promise.all()` for data, pass to client component

**Current category code** (see `src/features/registration/attendees-queries.ts`):
- `getAttendeeCategories(eventId)` — returns `string[]` from `SELECT DISTINCT category`
- `getAttendees()` — filters with `.eq("category", category)`
- Attendees table uses `<select>` dropdown + `<datalist>` for freeform input

**Latest migration:** 068. Next migration: 069.

---

## Task 0: Navigation Update

**Files:**
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/layout.tsx`

**Step 1: Add "Attendee Categories" to the Attendees tab sidebar**

In `layout.tsx`, find the `Attendees` group (around line 83-99). Add `Attendee Categories` as a child under `Manage Attendees`:

```typescript
{
  label: "Attendees",
  icon: "users" as const,
  firstHref: `/events/${eventId}/registrations`,
  items: [
    {
      href: `/events/${eventId}/registrations`,
      label: "Manage Attendees",
      icon: "users",
      children: [
        { href: `/events/${eventId}/registrations`, label: "Attendees" },
        { href: `/events/${eventId}/attendee-limit`, label: "Attendee Limit Upgrade" },
        { href: `/events/${eventId}/attendee-categories`, label: "Attendee Categories" },
      ],
    },
    { href: `/events/${eventId}/check-in`, label: "Check-in", icon: "qr-code" },
    { href: `/events/${eventId}/badges`, label: "Badges", icon: "id-card" },
  ],
},
```

**Step 2: Commit**

```bash
git add apps/web/src/app/\(organizer\)/events/\[eventId\]/layout.tsx
git commit -m "feat: add Attendee Categories to navigation sidebar"
```

---

## Task 1: Migration — attendee_categories table

**Files:**
- Create: `packages/supabase/migrations/069_attendee_categories.sql`

**Step 1: Write the migration**

```sql
-- Migration 069: Attendee categories with ticket mapping and visibility matrix

-- =====================
-- 1. ATTENDEE CATEGORIES TABLE
-- =====================

CREATE TABLE public.attendee_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'blue',
  is_visible_in_directory BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.attendee_categories ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendee_categories TO authenticated;

CREATE UNIQUE INDEX idx_attendee_categories_event_name ON public.attendee_categories(event_id, name);
CREATE INDEX idx_attendee_categories_event ON public.attendee_categories(event_id);

CREATE POLICY "Org members can manage attendee categories"
  ON public.attendee_categories FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = attendee_categories.event_id AND is_org_member(e.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = attendee_categories.event_id AND is_org_member(e.organization_id)
  ));

CREATE POLICY "Public can view attendee categories"
  ON public.attendee_categories FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = attendee_categories.event_id AND e.status = 'published'
  ));

-- Also allow anon to view categories for public pages
GRANT SELECT ON public.attendee_categories TO anon;
CREATE POLICY "Anon can view attendee categories"
  ON public.attendee_categories FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = attendee_categories.event_id AND e.status = 'published'
  ));

-- =====================
-- 2. TICKET TYPE CATEGORIES JOIN TABLE
-- =====================

CREATE TABLE public.ticket_type_categories (
  ticket_type_id UUID NOT NULL REFERENCES public.ticket_types(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.attendee_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (ticket_type_id, category_id)
);

ALTER TABLE public.ticket_type_categories ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_type_categories TO authenticated;

CREATE INDEX idx_ticket_type_categories_category ON public.ticket_type_categories(category_id);

CREATE POLICY "Org members can manage ticket type categories"
  ON public.ticket_type_categories FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM ticket_types tt
    JOIN events e ON e.id = tt.event_id
    WHERE tt.id = ticket_type_categories.ticket_type_id AND is_org_member(e.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM ticket_types tt
    JOIN events e ON e.id = tt.event_id
    WHERE tt.id = ticket_type_categories.ticket_type_id AND is_org_member(e.organization_id)
  ));

CREATE POLICY "Public can view ticket type categories"
  ON public.ticket_type_categories FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM ticket_types tt
    JOIN events e ON e.id = tt.event_id
    WHERE tt.id = ticket_type_categories.ticket_type_id AND e.status = 'published'
  ));

-- =====================
-- 3. CATEGORY VISIBILITY MATRIX
-- =====================

CREATE TABLE public.category_visibility (
  viewer_category_id UUID NOT NULL REFERENCES public.attendee_categories(id) ON DELETE CASCADE,
  visible_category_id UUID NOT NULL REFERENCES public.attendee_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (viewer_category_id, visible_category_id)
);

ALTER TABLE public.category_visibility ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.category_visibility TO authenticated;

CREATE INDEX idx_category_visibility_viewer ON public.category_visibility(viewer_category_id);
CREATE INDEX idx_category_visibility_visible ON public.category_visibility(visible_category_id);

CREATE POLICY "Org members can manage category visibility"
  ON public.category_visibility FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM attendee_categories ac
    JOIN events e ON e.id = ac.event_id
    WHERE ac.id = category_visibility.viewer_category_id AND is_org_member(e.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM attendee_categories ac
    JOIN events e ON e.id = ac.event_id
    WHERE ac.id = category_visibility.viewer_category_id AND is_org_member(e.organization_id)
  ));

CREATE POLICY "Public can view category visibility"
  ON public.category_visibility FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM attendee_categories ac
    JOIN events e ON e.id = ac.event_id
    WHERE ac.id = category_visibility.viewer_category_id AND e.status = 'published'
  ));

-- =====================
-- 4. ADD category_id FK TO REGISTRATIONS
-- =====================

ALTER TABLE public.registrations
  ADD COLUMN category_id UUID REFERENCES public.attendee_categories(id) ON DELETE SET NULL;

CREATE INDEX idx_registrations_category_id ON public.registrations(event_id, category_id);
```

**Step 2: Apply the migration**

```bash
cd packages/supabase && npx supabase migration up
```

Expected: Migration applied successfully. **Never use `supabase db reset`.**

**Step 3: Commit**

```bash
git add packages/supabase/migrations/069_attendee_categories.sql
git commit -m "feat: add attendee_categories, ticket_type_categories, category_visibility tables and registrations.category_id FK"
```

---

## Task 2: Data Migration — backfill existing categories

**Files:**
- Create: `packages/supabase/migrations/070_backfill_categories.sql`

**Step 1: Write the data migration**

```sql
-- Migration 070: Backfill attendee_categories from existing freeform registrations.category values

-- 1. Create attendee_categories rows from distinct non-null category values per event
INSERT INTO public.attendee_categories (event_id, name, color, sort_order)
SELECT DISTINCT r.event_id, r.category, 'blue', 0
FROM public.registrations r
WHERE r.category IS NOT NULL AND r.category != ''
ON CONFLICT DO NOTHING;

-- 2. Backfill category_id on registrations
UPDATE public.registrations r
SET category_id = ac.id
FROM public.attendee_categories ac
WHERE r.event_id = ac.event_id
  AND r.category = ac.name
  AND r.category_id IS NULL;

-- 3. Insert default all-to-all visibility matrix for each event's categories
INSERT INTO public.category_visibility (viewer_category_id, visible_category_id)
SELECT a.id, b.id
FROM public.attendee_categories a
JOIN public.attendee_categories b ON a.event_id = b.event_id
ON CONFLICT DO NOTHING;
```

**Step 2: Apply the migration**

```bash
cd packages/supabase && npx supabase migration up
```

**Step 3: Commit**

```bash
git add packages/supabase/migrations/070_backfill_categories.sql
git commit -m "feat: backfill attendee_categories from existing freeform category values"
```

---

## Task 3: Categories Queries (TDD)

**Files:**
- Create: `apps/web/src/features/attendee-categories/queries.ts`
- Create: `apps/web/src/features/attendee-categories/queries.test.ts`

**Step 1: Write the failing tests**

```typescript
// queries.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient } from "@attendly/ui/supabase/server";

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(),
}));

function createMockSupabase(overrides: Record<string, unknown> = {}) {
  const chainable = new Proxy(
    {},
    {
      get(_, prop) {
        if (prop in overrides) return overrides[prop];
        if (prop === "then") return undefined;
        return () => chainable;
      },
    }
  );
  return { from: vi.fn(() => chainable) };
}

describe("getCategories", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns categories ordered by sort_order", async () => {
    const mockCategories = [
      { id: "cat-1", event_id: "evt-1", name: "Speaker", color: "blue", is_visible_in_directory: true, sort_order: 0 },
      { id: "cat-2", event_id: "evt-1", name: "VIP", color: "purple", is_visible_in_directory: true, sort_order: 1 },
    ];
    const mock = createMockSupabase({
      order: () => ({ data: mockCategories, error: null }),
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const { getCategories } = await import("./queries");
    const result = await getCategories("evt-1");
    expect(result).toEqual(mockCategories);
    expect(mock.from).toHaveBeenCalledWith("attendee_categories");
  });

  it("throws on error", async () => {
    const mock = createMockSupabase({
      order: () => ({ data: null, error: { message: "DB error" } }),
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const { getCategories } = await import("./queries");
    await expect(getCategories("evt-1")).rejects.toThrow("DB error");
  });
});

describe("getVisibilityMatrix", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns visibility pairs for event categories", async () => {
    const mockPairs = [
      { viewer_category_id: "cat-1", visible_category_id: "cat-2" },
    ];
    const mock = createMockSupabase({
      in: () => ({ data: mockPairs, error: null }),
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const { getVisibilityMatrix } = await import("./queries");
    const result = await getVisibilityMatrix(["cat-1", "cat-2"]);
    expect(result).toEqual(mockPairs);
  });
});

describe("getTicketCategoryMappings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns mappings for event ticket types", async () => {
    const mockMappings = [
      { ticket_type_id: "tt-1", category_id: "cat-1" },
    ];
    const mock = createMockSupabase({
      in: () => ({ data: mockMappings, error: null }),
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const { getTicketCategoryMappings } = await import("./queries");
    const result = await getTicketCategoryMappings(["tt-1"]);
    expect(result).toEqual(mockMappings);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
cd apps/web && npx vitest run src/features/attendee-categories/queries.test.ts
```

Expected: FAIL — module not found.

**Step 3: Write the implementation**

```typescript
// queries.ts
import { createClient } from "@attendly/ui/supabase/server";

export type AttendeeCategory = {
  id: string;
  event_id: string;
  name: string;
  color: string;
  is_visible_in_directory: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type VisibilityPair = {
  viewer_category_id: string;
  visible_category_id: string;
};

export type TicketCategoryMapping = {
  ticket_type_id: string;
  category_id: string;
};

export async function getCategories(eventId: string): Promise<AttendeeCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("attendee_categories")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return data as AttendeeCategory[];
}

export async function getVisibilityMatrix(categoryIds: string[]): Promise<VisibilityPair[]> {
  if (categoryIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("category_visibility")
    .select("viewer_category_id, visible_category_id")
    .in("viewer_category_id", categoryIds);
  if (error) throw new Error(error.message);
  return data as VisibilityPair[];
}

export async function getTicketCategoryMappings(ticketTypeIds: string[]): Promise<TicketCategoryMapping[]> {
  if (ticketTypeIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ticket_type_categories")
    .select("ticket_type_id, category_id")
    .in("ticket_type_id", ticketTypeIds);
  if (error) throw new Error(error.message);
  return data as TicketCategoryMapping[];
}
```

**Step 4: Run tests to verify they pass**

```bash
cd apps/web && npx vitest run src/features/attendee-categories/queries.test.ts
```

Expected: 4 tests PASS.

**Step 5: Commit**

```bash
git add apps/web/src/features/attendee-categories/queries.ts apps/web/src/features/attendee-categories/queries.test.ts
git commit -m "feat: add attendee categories queries with tests"
```

---

## Task 4: Categories Actions (TDD)

**Files:**
- Create: `apps/web/src/features/attendee-categories/actions.ts`
- Create: `apps/web/src/features/attendee-categories/actions.test.ts`

**Step 1: Write the failing tests**

```typescript
// actions.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

function createMockSupabase(overrides: Record<string, unknown> = {}) {
  const chainable = new Proxy(
    {},
    {
      get(_, prop) {
        if (prop in overrides) return overrides[prop];
        if (prop === "then") return undefined;
        return () => chainable;
      },
    }
  );
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
    from: vi.fn(() => chainable),
  };
}

describe("createCategory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a category and inserts visibility rows", async () => {
    const newCat = { id: "cat-new", event_id: "evt-1", name: "VIP", color: "purple" };
    const existingCats = [{ id: "cat-1" }];
    let insertCount = 0;
    const mock = createMockSupabase({
      single: () => ({ data: newCat, error: null }),
      limit: () => ({ data: [{ sort_order: 0 }], error: null }),
      order: () => ({
        limit: () => ({ data: [{ sort_order: 0 }], error: null }),
      }),
    });
    // Track from() calls
    const origFrom = mock.from;
    mock.from = vi.fn((table: string) => {
      if (table === "attendee_categories" || table === "category_visibility") {
        return origFrom(table);
      }
      return origFrom(table);
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const { createCategory } = await import("./actions");
    const result = await createCategory("evt-1", { name: "VIP", color: "purple" });
    expect(mock.from).toHaveBeenCalledWith("attendee_categories");
    expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/attendee-categories");
  });

  it("throws if name is empty", async () => {
    const { createCategory } = await import("./actions");
    await expect(createCategory("evt-1", { name: "", color: "blue" })).rejects.toThrow("Name is required");
  });

  it("throws if not authenticated", async () => {
    const mock = createMockSupabase();
    mock.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null } });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const { createCategory } = await import("./actions");
    await expect(createCategory("evt-1", { name: "VIP", color: "blue" })).rejects.toThrow("Authentication required");
  });
});

describe("updateCategory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updates a category", async () => {
    const mock = createMockSupabase({
      eq: () => ({ error: null }),
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const { updateCategory } = await import("./actions");
    await updateCategory("evt-1", "cat-1", { name: "Sponsor", color: "green" });
    expect(mock.from).toHaveBeenCalledWith("attendee_categories");
    expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/attendee-categories");
  });

  it("throws if not authenticated", async () => {
    const mock = createMockSupabase();
    mock.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null } });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const { updateCategory } = await import("./actions");
    await expect(updateCategory("evt-1", "cat-1", { name: "X" })).rejects.toThrow("Authentication required");
  });
});

describe("deleteCategory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes a category", async () => {
    const mock = createMockSupabase({
      eq: () => ({ error: null }),
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const { deleteCategory } = await import("./actions");
    await deleteCategory("evt-1", "cat-1");
    expect(mock.from).toHaveBeenCalledWith("attendee_categories");
    expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/attendee-categories");
  });
});

describe("setTicketCategoryMapping", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes existing mappings and inserts new one", async () => {
    const mock = createMockSupabase({
      eq: () => ({ error: null }),
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const { setTicketCategoryMapping } = await import("./actions");
    await setTicketCategoryMapping("evt-1", "tt-1", "cat-1");
    expect(mock.from).toHaveBeenCalledWith("ticket_type_categories");
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("only deletes when categoryId is null", async () => {
    const mock = createMockSupabase({
      eq: () => ({ error: null }),
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const { setTicketCategoryMapping } = await import("./actions");
    await setTicketCategoryMapping("evt-1", "tt-1", null);
    expect(mock.from).toHaveBeenCalledWith("ticket_type_categories");
  });
});

describe("toggleVisibility", () => {
  beforeEach(() => vi.clearAllMocks());

  it("inserts visibility row when enabling", async () => {
    const mock = createMockSupabase({
      eq: () => ({ error: null }),
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const { toggleVisibility } = await import("./actions");
    await toggleVisibility("evt-1", "cat-1", "cat-2", true);
    expect(mock.from).toHaveBeenCalledWith("category_visibility");
  });

  it("deletes visibility row when disabling", async () => {
    const mock = createMockSupabase({
      eq: () => ({ error: null }),
    });
    vi.mocked(createClient).mockResolvedValue(mock as never);

    const { toggleVisibility } = await import("./actions");
    await toggleVisibility("evt-1", "cat-1", "cat-2", false);
    expect(mock.from).toHaveBeenCalledWith("category_visibility");
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
cd apps/web && npx vitest run src/features/attendee-categories/actions.test.ts
```

Expected: FAIL — module not found.

**Step 3: Write the implementation**

```typescript
// actions.ts
"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

const VALID_COLORS = ["blue", "green", "red", "purple", "orange", "pink", "yellow", "gray"];

export async function createCategory(
  eventId: string,
  data: { name: string; color: string; is_visible_in_directory?: boolean }
) {
  if (!data.name?.trim()) throw new Error("Name is required");
  if (!VALID_COLORS.includes(data.color)) throw new Error("Invalid color");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  // Get next sort_order
  const { data: existing } = await supabase
    .from("attendee_categories")
    .select("sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const sortOrder = existing?.[0] ? existing[0].sort_order + 1 : 0;

  // Get existing category IDs for visibility matrix
  const { data: existingCats } = await supabase
    .from("attendee_categories")
    .select("id")
    .eq("event_id", eventId);

  const { data: category, error } = await supabase
    .from("attendee_categories")
    .insert({
      event_id: eventId,
      name: data.name.trim(),
      color: data.color,
      is_visible_in_directory: data.is_visible_in_directory ?? true,
      sort_order: sortOrder,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Insert default all-to-all visibility rows
  const visibilityRows: { viewer_category_id: string; visible_category_id: string }[] = [];
  const existingIds = (existingCats ?? []).map((c: { id: string }) => c.id);

  for (const existingId of existingIds) {
    visibilityRows.push({ viewer_category_id: category.id, visible_category_id: existingId });
    visibilityRows.push({ viewer_category_id: existingId, visible_category_id: category.id });
  }
  // Self-visibility
  visibilityRows.push({ viewer_category_id: category.id, visible_category_id: category.id });

  if (visibilityRows.length > 0) {
    await supabase.from("category_visibility").insert(visibilityRows);
  }

  revalidatePath(`/events/${eventId}/attendee-categories`);
  return category;
}

export async function updateCategory(
  eventId: string,
  categoryId: string,
  data: { name?: string; color?: string; is_visible_in_directory?: boolean; sort_order?: number }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.name !== undefined) updates.name = data.name.trim();
  if (data.color !== undefined) updates.color = data.color;
  if (data.is_visible_in_directory !== undefined) updates.is_visible_in_directory = data.is_visible_in_directory;
  if (data.sort_order !== undefined) updates.sort_order = data.sort_order;

  const { error } = await supabase
    .from("attendee_categories")
    .update(updates)
    .eq("id", categoryId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/attendee-categories`);
}

export async function deleteCategory(eventId: string, categoryId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { error } = await supabase
    .from("attendee_categories")
    .delete()
    .eq("id", categoryId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/attendee-categories`);
}

export async function setTicketCategoryMapping(
  eventId: string,
  ticketTypeId: string,
  categoryId: string | null
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  // Delete existing mapping for this ticket type
  await supabase
    .from("ticket_type_categories")
    .delete()
    .eq("ticket_type_id", ticketTypeId);

  // Insert new mapping if categoryId provided
  if (categoryId) {
    const { error } = await supabase
      .from("ticket_type_categories")
      .insert({ ticket_type_id: ticketTypeId, category_id: categoryId });
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/events/${eventId}/attendee-categories`);
  revalidatePath(`/events/${eventId}/tickets`);
}

export async function toggleVisibility(
  eventId: string,
  viewerCategoryId: string,
  visibleCategoryId: string,
  enabled: boolean
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  if (enabled) {
    const { error } = await supabase
      .from("category_visibility")
      .upsert({ viewer_category_id: viewerCategoryId, visible_category_id: visibleCategoryId });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("category_visibility")
      .delete()
      .eq("viewer_category_id", viewerCategoryId)
      .eq("visible_category_id", visibleCategoryId);
    if (error) throw new Error(error.message);
  }

  revalidatePath(`/events/${eventId}/attendee-categories`);
}
```

**Step 4: Run tests to verify they pass**

```bash
cd apps/web && npx vitest run src/features/attendee-categories/actions.test.ts
```

Expected: 10 tests PASS.

**Step 5: Commit**

```bash
git add apps/web/src/features/attendee-categories/actions.ts apps/web/src/features/attendee-categories/actions.test.ts
git commit -m "feat: add attendee categories CRUD actions with visibility and ticket mapping"
```

---

## Task 5: Category Manager Component

**Files:**
- Create: `apps/web/src/features/attendee-categories/components/category-manager.tsx`

**Step 1: Write the component**

This is a `"use client"` component that handles:
- Category list with color dots, names, ticket mappings, visibility toggles
- Add/Edit category dialog with name, color palette, directory visibility toggle, ticket mapping dropdown
- Delete with confirmation dialog
- Visibility matrix grid (shown when 2+ categories)

```typescript
// components/category-manager.tsx
"use client";

import { useState, useTransition } from "react";
import {
  Button,
  Input,
  Label,
  Badge,
  Switch,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@attendly/ui/components";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  setTicketCategoryMapping,
  toggleVisibility,
} from "../actions";
import type { AttendeeCategory, VisibilityPair, TicketCategoryMapping } from "../queries";

const COLORS = [
  { name: "blue", bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" },
  { name: "green", bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
  { name: "red", bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
  { name: "purple", bg: "bg-purple-100", text: "text-purple-700", dot: "bg-purple-500" },
  { name: "orange", bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500" },
  { name: "pink", bg: "bg-pink-100", text: "text-pink-700", dot: "bg-pink-500" },
  { name: "yellow", bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500" },
  { name: "gray", bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-500" },
];

type TicketType = { id: string; name: string };

export function CategoryManager({
  eventId,
  categories: initialCategories,
  visibility: initialVisibility,
  ticketMappings: initialMappings,
  ticketTypes,
}: {
  eventId: string;
  categories: AttendeeCategory[];
  visibility: VisibilityPair[];
  ticketMappings: TicketCategoryMapping[];
  ticketTypes: TicketType[];
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [visibility, setVisibility] = useState(initialVisibility);
  const [mappings, setMappings] = useState(initialMappings);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AttendeeCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AttendeeCategory | null>(null);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [formName, setFormName] = useState("");
  const [formColor, setFormColor] = useState("blue");
  const [formVisible, setFormVisible] = useState(true);
  const [formTicketId, setFormTicketId] = useState<string>("");

  function openAdd() {
    setEditing(null);
    setFormName("");
    setFormColor("blue");
    setFormVisible(true);
    setFormTicketId("");
    setShowForm(true);
  }

  function openEdit(cat: AttendeeCategory) {
    setEditing(cat);
    setFormName(cat.name);
    setFormColor(cat.color);
    setFormVisible(cat.is_visible_in_directory);
    const mapping = mappings.find((m) => m.category_id === cat.id);
    setFormTicketId(mapping?.ticket_type_id ?? "");
    setShowForm(true);
  }

  async function handleSubmit() {
    startTransition(async () => {
      try {
        if (editing) {
          await updateCategory(eventId, editing.id, {
            name: formName,
            color: formColor,
            is_visible_in_directory: formVisible,
          });
          // Update ticket mapping if changed
          const currentMapping = mappings.find((m) => m.category_id === editing.id);
          if ((currentMapping?.ticket_type_id ?? "") !== formTicketId) {
            if (formTicketId) {
              await setTicketCategoryMapping(eventId, formTicketId, editing.id);
            } else if (currentMapping) {
              await setTicketCategoryMapping(eventId, currentMapping.ticket_type_id, null);
            }
          }
          setCategories((prev) =>
            prev.map((c) =>
              c.id === editing.id
                ? { ...c, name: formName, color: formColor, is_visible_in_directory: formVisible }
                : c
            )
          );
          toast.success("Category updated");
        } else {
          const newCat = await createCategory(eventId, {
            name: formName,
            color: formColor,
            is_visible_in_directory: formVisible,
          });
          if (formTicketId) {
            await setTicketCategoryMapping(eventId, formTicketId, newCat.id);
            setMappings((prev) => [...prev, { ticket_type_id: formTicketId, category_id: newCat.id }]);
          }
          setCategories((prev) => [...prev, newCat]);
          // Add default visibility rows to local state
          const newVisRows: VisibilityPair[] = [];
          for (const cat of categories) {
            newVisRows.push({ viewer_category_id: newCat.id, visible_category_id: cat.id });
            newVisRows.push({ viewer_category_id: cat.id, visible_category_id: newCat.id });
          }
          newVisRows.push({ viewer_category_id: newCat.id, visible_category_id: newCat.id });
          setVisibility((prev) => [...prev, ...newVisRows]);
          toast.success("Category created");
        }
        setShowForm(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save category");
      }
    });
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    startTransition(async () => {
      try {
        await deleteCategory(eventId, deleteTarget.id);
        setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id));
        setVisibility((prev) =>
          prev.filter(
            (v) => v.viewer_category_id !== deleteTarget.id && v.visible_category_id !== deleteTarget.id
          )
        );
        setMappings((prev) => prev.filter((m) => m.category_id !== deleteTarget.id));
        setDeleteTarget(null);
        toast.success("Category deleted");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  }

  function isVisible(viewerId: string, visibleId: string) {
    return visibility.some(
      (v) => v.viewer_category_id === viewerId && v.visible_category_id === visibleId
    );
  }

  async function handleToggleVisibility(viewerId: string, visibleId: string, enabled: boolean) {
    // Optimistic update
    if (enabled) {
      setVisibility((prev) => [...prev, { viewer_category_id: viewerId, visible_category_id: visibleId }]);
    } else {
      setVisibility((prev) =>
        prev.filter((v) => !(v.viewer_category_id === viewerId && v.visible_category_id === visibleId))
      );
    }
    startTransition(async () => {
      try {
        await toggleVisibility(eventId, viewerId, visibleId, enabled);
      } catch (err) {
        // Revert on error
        if (enabled) {
          setVisibility((prev) =>
            prev.filter((v) => !(v.viewer_category_id === viewerId && v.visible_category_id === visibleId))
          );
        } else {
          setVisibility((prev) => [...prev, { viewer_category_id: viewerId, visible_category_id: visibleId }]);
        }
        toast.error("Failed to update visibility");
      }
    });
  }

  function getColorClasses(color: string) {
    return COLORS.find((c) => c.name === color) ?? COLORS[0];
  }

  function getTicketName(catId: string) {
    const mapping = mappings.find((m) => m.category_id === catId);
    if (!mapping) return null;
    return ticketTypes.find((t) => t.id === mapping.ticket_type_id)?.name ?? null;
  }

  return (
    <div className="space-y-8">
      {/* Category List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Categories</h3>
          <Button onClick={openAdd} size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            Add Category
          </Button>
        </div>

        {categories.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-muted-foreground">No categories defined yet.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Categories let you organize attendees into groups like Speaker, VIP, or General.
            </p>
            <Button onClick={openAdd} variant="outline" size="sm" className="mt-4">
              <Plus className="mr-1.5 h-4 w-4" />
              Add First Category
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-sm font-medium text-muted-foreground">
                  <th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2">Ticket Mapping</th>
                  <th className="px-4 py-2">Directory</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => {
                  const colors = getColorClasses(cat.color);
                  const ticketName = getTicketName(cat.id);
                  return (
                    <tr key={cat.id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`h-3 w-3 rounded-full ${colors.dot}`} />
                          <span className="font-medium">{cat.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {ticketName ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={cat.is_visible_in_directory ? "success" : "secondary"}>
                          {cat.is_visible_in_directory ? "Visible" : "Hidden"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(cat)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(cat)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Visibility Matrix */}
      {categories.length >= 2 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">Visibility Matrix</h3>
            <p className="text-sm text-muted-foreground">
              Control which categories can see each other in the attendee directory.
            </p>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-sm font-medium text-muted-foreground">
                  <th className="px-4 py-2">Can see →</th>
                  {categories.map((cat) => (
                    <th key={cat.id} className="px-4 py-2 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${getColorClasses(cat.color).dot}`} />
                        {cat.name}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map((viewer) => (
                  <tr key={viewer.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${getColorClasses(viewer.color).dot}`} />
                        {viewer.name}
                      </div>
                    </td>
                    {categories.map((visible) => {
                      const viewerHidden = !viewer.is_visible_in_directory;
                      const visibleHidden = !visible.is_visible_in_directory;
                      const disabled = viewerHidden || visibleHidden;
                      return (
                        <td key={visible.id} className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={isVisible(viewer.id, visible.id)}
                            disabled={disabled}
                            onChange={(e) =>
                              handleToggleVisibility(viewer.id, visible.id, e.target.checked)
                            }
                            className={`h-4 w-4 rounded border-gray-300 ${disabled ? "opacity-30" : ""}`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Dialog */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
            <h3 className="text-lg font-semibold">
              {editing ? "Edit Category" : "Add Category"}
            </h3>
            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="cat-name">Name</Label>
                <Input
                  id="cat-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Speaker, VIP, General"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setFormColor(c.name)}
                      className={`h-8 w-8 rounded-full ${c.dot} ${
                        formColor === c.name ? "ring-2 ring-offset-2 ring-primary" : ""
                      }`}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="cat-visible">Visible in attendee directory</Label>
                <Switch
                  id="cat-visible"
                  checked={formVisible}
                  onCheckedChange={setFormVisible}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cat-ticket">Ticket Mapping</Label>
                <select
                  id="cat-ticket"
                  value={formTicketId}
                  onChange={(e) => setFormTicketId(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">None</option>
                  {ticketTypes.map((tt) => (
                    <option key={tt.id} value={tt.id}>
                      {tt.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Registrants who buy this ticket are auto-assigned this category.
                </p>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isPending || !formName.trim()}>
                {isPending ? "Saving..." : editing ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Attendees in this category will become uncategorized. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/attendee-categories/components/category-manager.tsx
git commit -m "feat: add category manager component with visibility matrix"
```

---

## Task 6: Attendee Categories Page

**Files:**
- Create: `apps/web/src/app/(organizer)/events/[eventId]/attendee-categories/page.tsx`

**Step 1: Write the page**

```typescript
import { Tags } from "lucide-react";
import { getCategories, getVisibilityMatrix, getTicketCategoryMappings } from "@/features/attendee-categories/queries";
import { CategoryManager } from "@/features/attendee-categories/components/category-manager";
import { createClient } from "@attendly/ui/supabase/server";

export default async function AttendeeCategoriesPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  // Fetch ticket types for the mapping dropdown
  const { data: ticketTypes } = await supabase
    .from("ticket_types")
    .select("id, name")
    .eq("event_id", eventId)
    .order("sort_order");

  const categories = await getCategories(eventId);
  const categoryIds = categories.map((c) => c.id);

  const [visibility, ticketMappings] = await Promise.all([
    getVisibilityMatrix(categoryIds),
    getTicketCategoryMappings(
      (ticketTypes ?? []).map((t: { id: string }) => t.id)
    ),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[oklch(0.445_0.107_295_/_0.1)]">
          <Tags className="h-5 w-5 text-[oklch(0.445_0.107_295)]" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold">Attendee Categories</h2>
          <p className="text-sm text-muted-foreground">
            Define categories to organize attendees and control directory visibility.
          </p>
        </div>
      </div>

      <CategoryManager
        eventId={eventId}
        categories={categories}
        visibility={visibility}
        ticketMappings={ticketMappings}
        ticketTypes={(ticketTypes ?? []).map((t: { id: string; name: string }) => ({
          id: t.id,
          name: t.name,
        }))}
      />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/app/\(organizer\)/events/\[eventId\]/attendee-categories/page.tsx
git commit -m "feat: add attendee categories organizer page"
```

---

## Task 7: Update Ticket Form — Category Dropdown

**Files:**
- Modify: `apps/web/src/features/tickets/components/ticket-form.tsx`
- Modify: `apps/web/src/features/tickets/actions.ts`

**Step 1: Update ticket form to accept and display category dropdown**

Add a `categories` prop to `TicketForm` and render a dropdown after the access code field:

```typescript
// Add to TicketFormData type:
// category_id: string;

// Add to props:
// categories?: { id: string; name: string; color: string }[];

// Add dropdown in form JSX after access code field:
{categories && categories.length > 0 && (
  <div className="space-y-1.5">
    <Label htmlFor="ticket-category">Auto-assign Category</Label>
    <select
      id="ticket-category"
      value={form.category_id}
      onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
      className="w-full rounded-md border px-3 py-2 text-sm"
    >
      <option value="">None</option>
      {categories.map((cat) => (
        <option key={cat.id} value={cat.id}>{cat.name}</option>
      ))}
    </select>
    <p className="text-xs text-muted-foreground">
      Registrants who buy this ticket are automatically assigned this category.
    </p>
  </div>
)}
```

**Step 2: Wire the ticket page to pass categories**

In the tickets page, fetch categories and pass to ticket form/list. When saving a ticket, call `setTicketCategoryMapping` from the attendee-categories actions.

**Step 3: Commit**

```bash
git add apps/web/src/features/tickets/components/ticket-form.tsx apps/web/src/features/tickets/actions.ts
git commit -m "feat: add category dropdown to ticket create/edit form"
```

---

## Task 8: Update Attendees Table — Use Defined Categories

**Files:**
- Modify: `apps/web/src/features/registration/attendees-queries.ts`
- Modify: `apps/web/src/features/registration/components/attendees-table.tsx`
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/registrations/page.tsx`

**Step 1: Update getAttendeeCategories to use defined categories**

Replace the existing `getAttendeeCategories` function that does `SELECT DISTINCT category` with a query against `attendee_categories`:

```typescript
// In attendees-queries.ts, update getAttendeeCategories:
export async function getAttendeeCategories(eventId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("attendee_categories")
    .select("id, name, color")
    .eq("event_id", eventId)
    .order("sort_order");
  return data ?? [];
}
```

**Step 2: Update attendees table**

- Change the category filter dropdown to use `{ id, name, color }` objects instead of plain strings
- Filter by `category_id` instead of `category` text
- Show color dot next to category name in table rows
- Update Add Attendee modal to use dropdown of defined categories (setting `category_id`)

**Step 3: Update registrations page**

- Pass category objects (with id/name/color) instead of string array
- Filter URL param changes from `?category=Speaker` to `?category_id=uuid`

**Step 4: Update tests**

Update `attendees-queries.test.ts` to match new `getAttendeeCategories` return shape.

**Step 5: Commit**

```bash
git add apps/web/src/features/registration/attendees-queries.ts \
  apps/web/src/features/registration/components/attendees-table.tsx \
  apps/web/src/features/registration/attendees-queries.test.ts \
  apps/web/src/app/\(organizer\)/events/\[eventId\]/registrations/page.tsx
git commit -m "feat: update attendees table to use defined categories with colors"
```

---

## Task 9: Update Add Attendee & Import — Use category_id

**Files:**
- Modify: `apps/web/src/features/registration/attendees-actions.ts`
- Modify: `apps/web/src/features/registration/attendees-actions.test.ts` (if exists)

**Step 1: Update addAttendee to use category_id**

```typescript
// In attendees-actions.ts, update addAttendee:
// Change from: category: data.category?.trim() || null,
// Change to:   category_id: data.category_id || null,
//              category: data.category_name?.trim() || null, // keep for backwards compat
```

**Step 2: Update importAttendees to match/create categories**

```typescript
// In importAttendees, after parsing CSV:
// 1. Fetch existing attendee_categories for the event
// 2. For each unique category string in CSV:
//    - If matches existing category name → use its id
//    - If no match → create new attendee_category, get id
// 3. Set category_id on each registration row
```

**Step 3: Update tests**

**Step 4: Commit**

```bash
git add apps/web/src/features/registration/attendees-actions.ts \
  apps/web/src/features/registration/attendees-actions.test.ts
git commit -m "feat: update addAttendee and importAttendees to use category_id"
```

---

## Task 10: Update Announcement Composer — Use category_id

**Files:**
- Modify: `apps/web/src/features/announcements/components/announcement-composer.tsx`

**Step 1: Update category targeting**

- Change `categories` prop from `string[]` to `{ id: string; name: string; color: string }[]`
- Update audience type `"category"` to send `category_id` instead of category name string
- Update `"exclude_categories"` to use `category_id[]` instead of name strings
- Show color dots next to category names in dropdown/checkboxes

**Step 2: Update the announcements page that passes categories**

Fetch from `attendee_categories` table instead of `getAttendeeCategories` (which now returns objects).

**Step 3: Commit**

```bash
git add apps/web/src/features/announcements/components/announcement-composer.tsx
git commit -m "feat: update announcement composer to use defined category IDs"
```

---

## Task 11: Update Email Segments — Use category_id

**Files:**
- Modify: `apps/web/src/features/emails/lib/segments.ts`

**Step 1: Update segment filters**

```typescript
// In segments.ts, update SegmentFilters:
// Change from: category?: string
// Change to:   category_id?: string

// Change from: excluded_categories?: string[]
// Change to:   excluded_category_ids?: string[]

// Update query:
// Change from: query = query.eq("category", filters.category)
// Change to:   query = query.eq("category_id", filters.category_id)

// Change from: query = query.not("category", "in", ...)
// Change to:   query = query.not("category_id", "in", ...)
```

**Step 2: Update any callers of getSegmentedRecipients**

**Step 3: Commit**

```bash
git add apps/web/src/features/emails/lib/segments.ts
git commit -m "feat: update email segments to filter by category_id"
```

---

## Task 12: Update CSV Export — Resolve category_id to name

**Files:**
- Modify: `apps/web/src/features/registration/components/attendees-table.tsx` (CSV export section)

**Step 1: Update CSV export**

The CSV export should resolve `category_id` to the category name. Since the attendees table component already receives the categories list, map `category_id` → `name` when building CSV rows:

```typescript
// In CSV export logic:
// Change from: row.category ?? ""
// Change to:   categories.find(c => c.id === row.category_id)?.name ?? row.category ?? ""
```

**Step 2: Commit**

```bash
git add apps/web/src/features/registration/components/attendees-table.tsx
git commit -m "feat: update CSV export to resolve category_id to name"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 0 | Navigation update | layout.tsx |
| 1 | Migration — 3 new tables + FK | 069_attendee_categories.sql |
| 2 | Data migration — backfill | 070_backfill_categories.sql |
| 3 | Categories queries (TDD) | queries.ts, queries.test.ts |
| 4 | Categories actions (TDD) | actions.ts, actions.test.ts |
| 5 | Category manager component | category-manager.tsx |
| 6 | Attendee categories page | page.tsx |
| 7 | Ticket form — category dropdown | ticket-form.tsx |
| 8 | Attendees table — defined categories | attendees-table.tsx, attendees-queries.ts |
| 9 | Add/Import attendees — category_id | attendees-actions.ts |
| 10 | Announcement composer — category_id | announcement-composer.tsx |
| 11 | Email segments — category_id | segments.ts |
| 12 | CSV export — resolve category_id | attendees-table.tsx |

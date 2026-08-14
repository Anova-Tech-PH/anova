# Attendee Matchmaking Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build interest-based attendee matchmaking where organizers define event interests, attendees select them, and see ranked matches based on shared interests.

**Architecture:** Migration creates `event_interests` and `attendee_interests` tables. Organizer manages interests via `apps/web`. Attendees select interests and view matches via `apps/attendee`. Messaging uses the existing attendee messaging system. AI interest generation calls Claude API from a server action.

**Tech Stack:** Next.js 16, Supabase (PostgreSQL + RLS), React 19, TypeScript, Vitest, `@anthropic-ai/sdk`

**Key Discovery:** Two separate apps exist:
- `apps/web/` — organizer dashboard
- `apps/attendee/` — attendee-facing app (already has `/messages`, `/people`)
- `profiles` table already has `interests text[]` and `looking_for text[]` columns

---

### Task 1: Database Migration

**Files:**
- Create: `packages/supabase/migrations/071_attendee_matchmaking.sql`

**Step 1: Write the migration**

```sql
-- =====================
-- Migration 071: Attendee Matchmaking
-- event_interests: organizer-defined interests per event
-- attendee_interests: attendee selections
-- =====================

-- Event interests (organizer-managed)
CREATE TABLE public.event_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) <= 30),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_interests_event ON public.event_interests(event_id, sort_order);

-- Attendee interest selections
CREATE TABLE public.attendee_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interest_id uuid NOT NULL REFERENCES public.event_interests(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, interest_id)
);

CREATE INDEX idx_attendee_interests_event_user ON public.attendee_interests(event_id, user_id);
CREATE INDEX idx_attendee_interests_interest ON public.attendee_interests(interest_id);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_interests TO authenticated;
GRANT SELECT ON public.event_interests TO anon;
GRANT SELECT, INSERT, DELETE ON public.attendee_interests TO authenticated;

-- RLS: event_interests
ALTER TABLE public.event_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view event interests"
  ON public.event_interests FOR SELECT
  USING (true);

CREATE POLICY "Org members can manage event interests"
  ON public.event_interests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id
        AND public.is_org_member(e.organization_id)
    )
  );

-- RLS: attendee_interests
ALTER TABLE public.attendee_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view attendee interests for their event"
  ON public.attendee_interests FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own interest selections"
  ON public.attendee_interests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interest selections"
  ON public.attendee_interests FOR DELETE
  USING (auth.uid() = user_id);
```

**Step 2: Apply migration**

Run: `docker exec -i supabase_db_attendly psql -U postgres -d postgres < packages/supabase/migrations/071_attendee_matchmaking.sql`
Expected: Tables and policies created without errors.

**Step 3: Commit**

```bash
git add packages/supabase/migrations/071_attendee_matchmaking.sql
git commit -m "feat(db): add attendee matchmaking tables (migration 071)"
```

---

### Task 2: Organizer Queries & Actions

**Files:**
- Create: `apps/web/src/features/matchmaking/queries.ts`
- Create: `apps/web/src/features/matchmaking/actions.ts`
- Create: `apps/web/src/features/matchmaking/actions.test.ts`

**Step 1: Write queries**

```typescript
// queries.ts
import { createClient } from "@attendly/ui/supabase/server";

export type EventInterest = {
  id: string;
  event_id: string;
  name: string;
  sort_order: number;
  attendee_count: number;
  created_at: string;
  updated_at: string;
};

export async function getEventInterests(eventId: string): Promise<{
  interests: EventInterest[];
  total: number;
  attendeesParticipating: number;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("event_interests")
    .select("*, attendee_interests(count)")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  const interests = (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    attendee_count:
      (row.attendee_interests as { count: number }[])?.[0]?.count ?? 0,
    attendee_interests: undefined,
  })) as EventInterest[];

  // Count distinct attendees participating
  const { count } = await supabase
    .from("attendee_interests")
    .select("user_id", { count: "exact", head: true })
    .eq("event_id", eventId);

  return {
    interests,
    total: interests.length,
    attendeesParticipating: count ?? 0,
  };
}
```

**Step 2: Write action tests**

```typescript
// actions.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createInterest, updateInterest, deleteInterest } from "./actions";
import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

function createQueryMock(overrides: Record<string, unknown> = {}) {
  const mock: Record<string, unknown> = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: "interest-1" }, error: null }),
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-1" } },
        error: null,
      }),
    },
    ...overrides,
  };
  return mock;
}

describe("Matchmaking Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createInterest creates and revalidates", async () => {
    const mock = createQueryMock();
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mock);

    await createInterest("evt-1", { name: "AI" });

    expect(mock.from).toHaveBeenCalledWith("event_interests");
    expect(mock.insert).toHaveBeenCalledWith(
      expect.objectContaining({ event_id: "evt-1", name: "AI" })
    );
    expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/matchmaking");
  });

  it("createInterest throws when not authenticated", async () => {
    const mock = createQueryMock();
    mock.auth = {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    };
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mock);

    await expect(createInterest("evt-1", { name: "AI" })).rejects.toThrow(
      "Not authenticated"
    );
  });

  it("updateInterest updates and revalidates", async () => {
    const mock = createQueryMock();
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mock);

    await updateInterest("evt-1", "interest-1", { name: "Machine Learning" });

    expect(mock.from).toHaveBeenCalledWith("event_interests");
    expect(mock.update).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Machine Learning" })
    );
    expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/matchmaking");
  });

  it("deleteInterest deletes and revalidates", async () => {
    const mock = createQueryMock();
    (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mock);

    await deleteInterest("evt-1", "interest-1");

    expect(mock.from).toHaveBeenCalledWith("event_interests");
    expect(mock.delete).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/events/evt-1/matchmaking");
  });
});
```

**Step 3: Write actions**

```typescript
// actions.ts
"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function createInterest(
  eventId: string,
  data: { name: string }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("event_interests")
    .insert({
      event_id: eventId,
      name: data.name,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/matchmaking`);
}

export async function updateInterest(
  eventId: string,
  interestId: string,
  data: { name?: string }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("event_interests")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", interestId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/matchmaking`);
}

export async function deleteInterest(eventId: string, interestId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("event_interests")
    .delete()
    .eq("id", interestId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/matchmaking`);
}

export async function generateInterests(eventId: string): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Fetch event details and sessions for context
  const { data: event } = await supabase
    .from("events")
    .select("title, description")
    .eq("id", eventId)
    .single();

  const { data: sessions } = await supabase
    .from("sessions")
    .select("title, description")
    .eq("event_id", eventId)
    .limit(50);

  if (!event) throw new Error("Event not found");

  const sessionList = (sessions ?? [])
    .map((s: { title: string; description: string | null }) => s.title)
    .join(", ");

  const prompt = `Given this event and its sessions, suggest up to 10 short interest tags (max 30 chars each) that attendees might share. Return ONLY a JSON array of strings, no explanation.

Event: ${event.title}
Description: ${event.description ?? ""}
Sessions: ${sessionList}

Example output: ["Artificial Intelligence", "Sustainability", "Leadership"]`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) throw new Error("Failed to generate interests");

  const result = await response.json();
  const text = result.content?.[0]?.text ?? "[]";
  const suggestions: string[] = JSON.parse(text);

  return suggestions.filter(
    (s: string) => typeof s === "string" && s.length <= 30
  ).slice(0, 10);
}
```

**Step 4: Run tests**

Run: `npx vitest run src/features/matchmaking/actions.test.ts --reporter=verbose`
Expected: 4 tests pass.

**Step 5: Commit**

```bash
git add src/features/matchmaking/queries.ts src/features/matchmaking/actions.ts src/features/matchmaking/actions.test.ts
git commit -m "feat: add matchmaking queries and actions with tests"
```

---

### Task 3: Organizer Matchmaking Page Components

**Files:**
- Create: `apps/web/src/features/matchmaking/components/interest-composer.tsx`
- Create: `apps/web/src/features/matchmaking/components/interest-composer.test.tsx`
- Create: `apps/web/src/features/matchmaking/components/matchmaking-page-client.tsx`
- Create: `apps/web/src/features/matchmaking/components/matchmaking-page-client.test.tsx`

**Step 1: Write interest composer tests**

```typescript
// interest-composer.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { InterestComposer } from "./interest-composer";

vi.mock("@/features/matchmaking/actions", () => ({
  createInterest: vi.fn(),
  updateInterest: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const defaultProps = {
  eventId: "evt-1",
  open: true,
  onClose: vi.fn(),
  draft: null as null | { id: string; name: string },
};

describe("InterestComposer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders modal when open", () => {
    render(<InterestComposer {...defaultProps} />);
    expect(screen.getByText("New Interest")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<InterestComposer {...defaultProps} open={false} />);
    expect(screen.queryByText("New Interest")).not.toBeInTheDocument();
  });

  it("renders name input", () => {
    render(<InterestComposer {...defaultProps} />);
    expect(screen.getByPlaceholderText(/interest name/i)).toBeInTheDocument();
  });

  it("shows character count", () => {
    render(<InterestComposer {...defaultProps} />);
    expect(screen.getByText("0/30")).toBeInTheDocument();
  });

  it("Create button disabled when empty", () => {
    render(<InterestComposer {...defaultProps} />);
    const btn = screen.getByRole("button", { name: /create/i });
    expect(btn).toBeDisabled();
  });

  it("pre-fills when editing", () => {
    render(
      <InterestComposer
        {...defaultProps}
        draft={{ id: "int-1", name: "AI" }}
      />
    );
    expect(screen.getByText("Edit Interest")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/interest name/i)).toHaveValue("AI");
  });
});
```

**Step 2: Implement interest composer**

```typescript
// interest-composer.tsx
"use client";

import { useState, useEffect, useTransition } from "react";
import { Button, ModalOverlay } from "@attendly/ui/components";
import { createInterest, updateInterest } from "@/features/matchmaking/actions";
import { toast } from "sonner";

interface InterestComposerProps {
  eventId: string;
  open: boolean;
  onClose: () => void;
  draft: { id: string; name: string } | null;
}

export function InterestComposer({
  eventId,
  open,
  onClose,
  draft,
}: InterestComposerProps) {
  const isEditing = !!draft;
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setName(draft?.name ?? "");
  }, [open, draft]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      try {
        if (isEditing) {
          await updateInterest(eventId, draft!.id, { name: name.trim() });
          toast.success("Interest updated");
        } else {
          await createInterest(eventId, { name: name.trim() });
          toast.success("Interest created");
        }
        onClose();
      } catch {
        toast.error(isEditing ? "Failed to update interest" : "Failed to create interest");
      }
    });
  }

  if (!open) return null;

  return (
    <ModalOverlay onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <h3 className="text-lg font-semibold">
          {isEditing ? "Edit Interest" : "New Interest"}
        </h3>
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            Interest name <span className="text-destructive">*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 30))}
            placeholder="Interest name"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            maxLength={30}
          />
          <p className="mt-1 text-right text-xs text-muted-foreground">
            {name.length}/30
          </p>
        </div>
        <div className="flex items-center justify-between gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!name.trim() || isPending}>
            {isPending
              ? isEditing ? "Saving..." : "Creating..."
              : isEditing ? "Save" : "Create"}
          </Button>
        </div>
      </form>
    </ModalOverlay>
  );
}
```

**Step 3: Write matchmaking page client tests**

```typescript
// matchmaking-page-client.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { MatchmakingPageClient } from "./matchmaking-page-client";

vi.mock("@/features/matchmaking/actions", () => ({
  createInterest: vi.fn(),
  updateInterest: vi.fn(),
  deleteInterest: vi.fn(),
  generateInterests: vi.fn(),
}));

vi.mock("@attendly/ui/components", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@attendly/ui/components");
  return {
    ...actual,
    useConfirm: () => ({
      confirm: vi.fn().mockResolvedValue(true),
      dialog: null,
    }),
  };
});

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const interests = [
  { id: "int-1", event_id: "evt-1", name: "AI", sort_order: 0, attendee_count: 12, created_at: "2025-01-01", updated_at: "2025-01-01" },
  { id: "int-2", event_id: "evt-1", name: "Sustainability", sort_order: 1, attendee_count: 8, created_at: "2025-01-01", updated_at: "2025-01-01" },
];

const defaultProps = {
  eventId: "evt-1",
  interests,
  total: 2,
  attendeesParticipating: 15,
};

describe("MatchmakingPageClient", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders page heading", () => {
    render(<MatchmakingPageClient {...defaultProps} />);
    expect(screen.getByRole("heading", { name: /attendee matchmaking/i })).toBeInTheDocument();
  });

  it("renders stats cards", () => {
    render(<MatchmakingPageClient {...defaultProps} />);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
  });

  it("renders interest names", () => {
    render(<MatchmakingPageClient {...defaultProps} />);
    expect(screen.getByText("AI")).toBeInTheDocument();
    expect(screen.getByText("Sustainability")).toBeInTheDocument();
  });

  it("renders attendee counts per interest", () => {
    render(<MatchmakingPageClient {...defaultProps} />);
    expect(screen.getByText("12 attendees")).toBeInTheDocument();
    expect(screen.getByText("8 attendees")).toBeInTheDocument();
  });

  it("renders Add interest button", () => {
    render(<MatchmakingPageClient {...defaultProps} />);
    expect(screen.getByRole("button", { name: /add interest/i })).toBeInTheDocument();
  });

  it("renders Generate interests button", () => {
    render(<MatchmakingPageClient {...defaultProps} />);
    expect(screen.getByRole("button", { name: /generate interests/i })).toBeInTheDocument();
  });

  it("shows empty state when no interests", () => {
    render(<MatchmakingPageClient {...defaultProps} interests={[]} total={0} attendeesParticipating={0} />);
    expect(screen.getByText(/add event-specific interests/i)).toBeInTheDocument();
  });

  it("renders edit and delete buttons for interests", () => {
    render(<MatchmakingPageClient {...defaultProps} />);
    expect(screen.getAllByRole("button", { name: /edit/i }).length).toBe(2);
    expect(screen.getAllByRole("button", { name: /delete/i }).length).toBe(2);
  });
});
```

**Step 4: Implement matchmaking page client**

Create `matchmaking-page-client.tsx` following the same pattern as `social-groups-page-client.tsx`:
- Stats cards (Interests defined, Attendees participating)
- Action buttons (Generate interests, Add interest)
- Table with interest name, attendee count, edit/delete actions
- Empty state with call-to-action
- InterestComposer modal for create/edit
- Delete confirmation dialog
- Toast feedback

**Step 5: Run all tests**

Run: `npx vitest run src/features/matchmaking/ --reporter=verbose`
Expected: All tests pass.

**Step 6: Commit**

```bash
git add src/features/matchmaking/components/
git commit -m "feat: add organizer matchmaking page components with tests"
```

---

### Task 4: Organizer Route & Navigation

**Files:**
- Create: `apps/web/src/app/(organizer)/events/[eventId]/matchmaking/page.tsx`
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/layout.tsx`

**Step 1: Create server page**

```typescript
// page.tsx
import { getEventInterests } from "@/features/matchmaking/queries";
import { MatchmakingPageClient } from "@/features/matchmaking/components/matchmaking-page-client";

export default async function MatchmakingPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const { interests, total, attendeesParticipating } = await getEventInterests(eventId);

  return (
    <MatchmakingPageClient
      eventId={eventId}
      interests={interests}
      total={total}
      attendeesParticipating={attendeesParticipating}
    />
  );
}
```

**Step 2: Add to sidebar navigation**

In `layout.tsx`, add "Attendee Matchmaking" to the Community children array:

```typescript
children: [
  { href: `/events/${eventId}/meetups`, label: "Meet-ups" },
  { href: `/events/${eventId}/discussion-topics`, label: "Discussion Topics" },
  { href: `/events/${eventId}/social-groups`, label: "Social Groups" },
  { href: `/events/${eventId}/matchmaking`, label: "Attendee Matchmaking" },
],
```

**Step 3: Commit**

```bash
git add "src/app/(organizer)/events/[eventId]/matchmaking/page.tsx" "src/app/(organizer)/events/[eventId]/layout.tsx"
git commit -m "feat: add organizer matchmaking route and sidebar navigation"
```

---

### Task 5: AI Interest Generation Dialog

**Files:**
- Create: `apps/web/src/features/matchmaking/components/generate-interests-dialog.tsx`
- Create: `apps/web/src/features/matchmaking/components/generate-interests-dialog.test.tsx`

**Step 1: Write tests**

```typescript
// generate-interests-dialog.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { GenerateInterestsDialog } from "./generate-interests-dialog";

vi.mock("@/features/matchmaking/actions", () => ({
  generateInterests: vi.fn().mockResolvedValue(["AI", "Sustainability", "Leadership"]),
  createInterest: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const defaultProps = {
  eventId: "evt-1",
  open: true,
  onClose: vi.fn(),
};

describe("GenerateInterestsDialog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders modal when open", () => {
    render(<GenerateInterestsDialog {...defaultProps} />);
    expect(screen.getByText(/generate interests/i)).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<GenerateInterestsDialog {...defaultProps} open={false} />);
    expect(screen.queryByText(/generate interests/i)).not.toBeInTheDocument();
  });

  it("shows loading state initially", () => {
    render(<GenerateInterestsDialog {...defaultProps} />);
    expect(screen.getByText(/generating/i)).toBeInTheDocument();
  });
});
```

**Step 2: Implement generate interests dialog**

The dialog should:
- On open, call `generateInterests(eventId)` to get AI suggestions
- Show loading spinner while generating
- Display suggestions as checkboxes (all checked by default)
- "Add Selected" button creates checked interests via `createInterest`
- Cancel to close without adding
- Error state if generation fails

**Step 3: Run tests**

Run: `npx vitest run src/features/matchmaking/ --reporter=verbose`
Expected: All tests pass.

**Step 4: Commit**

```bash
git add src/features/matchmaking/components/generate-interests-dialog.tsx src/features/matchmaking/components/generate-interests-dialog.test.tsx
git commit -m "feat: add AI interest generation dialog with tests"
```

---

### Task 6: Attendee Matchmaking Queries & Actions

**Files:**
- Create: `apps/attendee/src/features/matchmaking/queries.ts`
- Create: `apps/attendee/src/features/matchmaking/actions.ts`

**Step 1: Write attendee queries**

```typescript
// queries.ts
import { createClient } from "@attendly/ui/supabase/server";

export type EventInterest = {
  id: string;
  name: string;
  selected: boolean;
};

export type MatchedAttendee = {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  company: string | null;
  job_title: string | null;
  shared_interests: string[];
  shared_count: number;
};

export async function getEventInterestsForAttendee(
  eventId: string,
  userId: string
): Promise<EventInterest[]> {
  const supabase = await createClient();

  const { data: interests } = await supabase
    .from("event_interests")
    .select("id, name")
    .eq("event_id", eventId)
    .order("sort_order");

  const { data: selected } = await supabase
    .from("attendee_interests")
    .select("interest_id")
    .eq("event_id", eventId)
    .eq("user_id", userId);

  const selectedIds = new Set(
    (selected ?? []).map((s: { interest_id: string }) => s.interest_id)
  );

  return (interests ?? []).map((i: { id: string; name: string }) => ({
    id: i.id,
    name: i.name,
    selected: selectedIds.has(i.id),
  }));
}

export async function getMatches(
  eventId: string,
  userId: string
): Promise<MatchedAttendee[]> {
  const supabase = await createClient();

  // Get current user's selected interests
  const { data: myInterests } = await supabase
    .from("attendee_interests")
    .select("interest_id")
    .eq("event_id", eventId)
    .eq("user_id", userId);

  if (!myInterests || myInterests.length === 0) return [];

  const myInterestIds = myInterests.map(
    (i: { interest_id: string }) => i.interest_id
  );

  // Find other attendees who share at least 1 interest
  const { data: matches } = await supabase
    .from("attendee_interests")
    .select("user_id, interest_id")
    .eq("event_id", eventId)
    .in("interest_id", myInterestIds)
    .neq("user_id", userId);

  if (!matches || matches.length === 0) return [];

  // Group by user, count shared interests
  const userMap = new Map<string, string[]>();
  for (const m of matches as { user_id: string; interest_id: string }[]) {
    const list = userMap.get(m.user_id) ?? [];
    list.push(m.interest_id);
    userMap.set(m.user_id, list);
  }

  // Get interest names for display
  const { data: interestNames } = await supabase
    .from("event_interests")
    .select("id, name")
    .in("id", myInterestIds);

  const interestNameMap = new Map(
    (interestNames ?? []).map((i: { id: string; name: string }) => [i.id, i.name])
  );

  // Get profiles for matched users
  const userIds = [...userMap.keys()];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, bio, company, job_title")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles ?? []).map((p: Record<string, unknown>) => [p.id, p])
  );

  // Build match list sorted by shared count
  const result: MatchedAttendee[] = userIds
    .map((uid) => {
      const sharedIds = userMap.get(uid) ?? [];
      const profile = profileMap.get(uid) as Record<string, unknown> | undefined;
      return {
        user_id: uid,
        full_name: (profile?.full_name as string) ?? "Unknown",
        avatar_url: (profile?.avatar_url as string) ?? null,
        bio: (profile?.bio as string) ?? null,
        company: (profile?.company as string) ?? null,
        job_title: (profile?.job_title as string) ?? null,
        shared_interests: sharedIds.map((id) => interestNameMap.get(id) ?? id),
        shared_count: sharedIds.length,
      };
    })
    .sort((a, b) => b.shared_count - a.shared_count)
    .slice(0, 50);

  return result;
}
```

**Step 2: Write attendee actions**

```typescript
// actions.ts
"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function selectInterest(
  eventId: string,
  interestId: string,
  orgSlug: string,
  eventSlug: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("attendee_interests")
    .insert({ event_id: eventId, user_id: user.id, interest_id: interestId });

  if (error && !error.message.includes("duplicate")) throw new Error(error.message);
  revalidatePath(`/${orgSlug}/${eventSlug}/matchmaking`);
}

export async function deselectInterest(
  eventId: string,
  interestId: string,
  orgSlug: string,
  eventSlug: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("attendee_interests")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .eq("interest_id", interestId);

  if (error) throw new Error(error.message);
  revalidatePath(`/${orgSlug}/${eventSlug}/matchmaking`);
}
```

**Step 3: Commit**

```bash
git add apps/attendee/src/features/matchmaking/
git commit -m "feat: add attendee matchmaking queries and actions"
```

---

### Task 7: Attendee Matchmaking Page

**Files:**
- Create: `apps/attendee/src/features/matchmaking/components/matchmaking-page-client.tsx`
- Create: `apps/attendee/src/app/(app)/[orgSlug]/[eventSlug]/matchmaking/page.tsx`

**Step 1: Build the attendee matchmaking page**

The page should have two sections:

**Interest Selection (top):**
- Display all event interests as selectable chip/tag buttons
- Selected chips get a filled/highlighted style
- Clicking toggles selection (calls selectInterest/deselectInterest)
- "Select your interests to find people like you" helper text

**Matches List (below):**
- Shows after at least 1 interest selected
- Each match card: avatar placeholder, name, company/title, shared interests as small badges
- "You both like: AI, Sustainability" text
- "Message" button linking to existing `/messages` with that user
- Empty state: "No matches yet — more attendees will join soon!"

**Step 2: Create the server page**

```typescript
// page.tsx
import { createClient } from "@attendly/ui/supabase/server";
import { redirect } from "next/navigation";
import {
  getEventInterestsForAttendee,
  getMatches,
} from "@/features/matchmaking/queries";
import { MatchmakingPageClient } from "@/features/matchmaking/components/matchmaking-page-client";

export default async function AttendeeMatchmakingPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}) {
  const { orgSlug, eventSlug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Look up event by slug
  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("slug", eventSlug)
    .single();

  if (!event) redirect(`/${orgSlug}`);

  const [interests, matches] = await Promise.all([
    getEventInterestsForAttendee(event.id, user.id),
    getMatches(event.id, user.id),
  ]);

  return (
    <MatchmakingPageClient
      eventId={event.id}
      orgSlug={orgSlug}
      eventSlug={eventSlug}
      interests={interests}
      matches={matches}
    />
  );
}
```

**Step 3: Commit**

```bash
git add apps/attendee/src/features/matchmaking/components/ "apps/attendee/src/app/(app)/[orgSlug]/[eventSlug]/matchmaking/page.tsx"
git commit -m "feat: add attendee matchmaking page with interest selection and match list"
```

---

### Task 8: Attendee Navigation Integration

**Files:**
- Modify: `apps/attendee/src/app/(app)/layout.tsx` — add Matchmaking to nav

**Step 1: Add Matchmaking to attendee nav**

Add a "Matchmaking" entry to the attendee sidebar/bottom nav. This may need to be event-context-aware (only show when inside an event). Check the existing layout pattern for how event-specific nav items work.

If the attendee nav is global (not event-specific), add "Matchmaking" as a top-level item alongside People, Rooms, etc.

**Step 2: Commit**

```bash
git add "apps/attendee/src/app/(app)/layout.tsx"
git commit -m "feat: add matchmaking to attendee navigation"
```

---

### Task 9: Playwright UI Testing

**Step 1: Test organizer matchmaking page**
- Navigate to `/events/{eventId}/matchmaking`
- Verify page renders with heading, stats, empty state
- Test Add interest flow (create, verify in table)
- Test Edit interest flow
- Test Delete interest flow with confirmation
- Check console for errors

**Step 2: Test attendee matchmaking page**
- Navigate to attendee matchmaking page
- Verify interest chips render
- Test selecting/deselecting interests
- Verify matches appear (if test data exists)

**Step 3: Generate UX report and auto-fix issues**

**Step 4: Commit any fixes**

```bash
git commit -m "fix: address UX issues from matchmaking testing"
```

# Logistics Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace structured JSONB logistics with Whova-style generic logistics items (title + Markdown content, template picker, reorderable).

**Architecture:** New `logistics_items` table for generic items. Keep `venue_description` and `venue_map_url` on events table (website builder dependency). Drop `logistics` JSONB column. Organizer editor becomes item-based with markdown toolbar. Public page renders items with `react-markdown`.

**Tech Stack:** Supabase (PostgreSQL, RLS), Next.js 16 server actions, React 19, `react-markdown`, Vitest

---

### Task 1: Database Migration

**Files:**
- Create: `packages/supabase/migrations/089_logistics_items.sql`

**Step 1: Write the migration**

```sql
-- =============================================================================
-- Migration 089: Logistics Items (Whova-style generic logistics)
-- Replaces the structured logistics JSONB column with a proper items table.
-- =============================================================================

-- =====================
-- 1. LOGISTICS_ITEMS TABLE
-- =====================

CREATE TABLE public.logistics_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  template TEXT NOT NULL CHECK (template IN ('welcome', 'venue', 'parking', 'hotel', 'travel_info', 'floor_map', 'custom')),
  title TEXT NOT NULL CHECK (char_length(title) <= 100),
  content TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.logistics_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_logistics_items_event_sort ON public.logistics_items(event_id, sort_order);

GRANT SELECT ON public.logistics_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.logistics_items TO authenticated;

-- =====================
-- 2. RLS POLICIES
-- =====================

-- Org members: full CRUD
CREATE POLICY "Org members can view logistics items"
  ON public.logistics_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = logistics_items.event_id
    AND is_org_member(e.organization_id)
  ));

CREATE POLICY "Org members can create logistics items"
  ON public.logistics_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = logistics_items.event_id
    AND is_org_member(e.organization_id)
  ));

CREATE POLICY "Org members can update logistics items"
  ON public.logistics_items FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = logistics_items.event_id
    AND is_org_member(e.organization_id)
  ));

CREATE POLICY "Org members can delete logistics items"
  ON public.logistics_items FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = logistics_items.event_id
    AND is_org_member(e.organization_id)
  ));

-- Public: anyone can read items for published events
CREATE POLICY "Anyone can view logistics for published events"
  ON public.logistics_items FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = logistics_items.event_id AND e.status = 'published'
  ));

CREATE POLICY "Authenticated can view logistics for published events"
  ON public.logistics_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = logistics_items.event_id AND e.status = 'published'
  ));

-- =====================
-- 3. DROP OLD JSONB COLUMN
-- =====================

ALTER TABLE public.events DROP COLUMN IF EXISTS logistics;
```

**Step 2: Apply the migration**

Run: `cd packages/supabase && npx supabase migration up`
Expected: Migration applied successfully. The `logistics_items` table exists, `events.logistics` column is gone, `events.venue_description` and `events.venue_map_url` remain.

**Step 3: Commit**

```bash
git add packages/supabase/migrations/089_logistics_items.sql
git commit -m "feat(db): add logistics_items table, drop logistics JSONB column"
```

---

### Task 2: Rewrite Queries

**Files:**
- Rewrite: `apps/web/src/features/logistics/queries.ts`

**Step 1: Write the failing test**

Create file `apps/web/src/features/logistics/queries.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: vi.fn(() => ({
        select: mockSelect.mockReturnValue({
          eq: mockEq.mockReturnValue({
            order: mockOrder.mockReturnValue({
              data: [
                {
                  id: "item-1",
                  event_id: "evt-1",
                  template: "parking",
                  title: "Parking Info",
                  content: "Free parking available",
                  sort_order: 0,
                  created_at: "2026-01-01T00:00:00Z",
                  updated_at: "2026-01-01T00:00:00Z",
                },
              ],
              error: null,
            }),
          }),
        }),
      })),
    })
  ),
}));

describe("getLogisticsItems", () => {
  it("returns logistics items sorted by sort_order", async () => {
    const { getLogisticsItems } = await import("./queries");
    const items = await getLogisticsItems("evt-1");

    expect(items).toHaveLength(1);
    expect(items[0].template).toBe("parking");
    expect(items[0].title).toBe("Parking Info");
    expect(mockOrder).toHaveBeenCalledWith("sort_order", { ascending: true });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run src/features/logistics/queries.test.ts`
Expected: FAIL — `getLogisticsItems` does not exist yet (the current file exports `getEventLogistics`)

**Step 3: Write minimal implementation**

Rewrite `apps/web/src/features/logistics/queries.ts`:

```typescript
import { createClient } from "@attendly/ui/supabase/server";

export interface LogisticsItem {
  id: string;
  event_id: string;
  template: "welcome" | "venue" | "parking" | "hotel" | "travel_info" | "floor_map" | "custom";
  title: string;
  content: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const TEMPLATES = [
  { value: "welcome", label: "Welcome" },
  { value: "venue", label: "Venue" },
  { value: "floor_map", label: "Floor Map" },
  { value: "travel_info", label: "Travel Info" },
  { value: "parking", label: "Parking" },
  { value: "hotel", label: "Hotel" },
  { value: "custom", label: "Custom" },
] as const;

export async function getLogisticsItems(eventId: string): Promise<LogisticsItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("logistics_items")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/web && npx vitest run src/features/logistics/queries.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/features/logistics/queries.ts apps/web/src/features/logistics/queries.test.ts
git commit -m "feat: rewrite logistics queries for item-based model"
```

---

### Task 3: Rewrite Server Actions

**Files:**
- Rewrite: `apps/web/src/features/logistics/actions.ts`
- Rewrite: `apps/web/src/features/logistics/actions.test.ts`

**Step 1: Write the failing tests**

Rewrite `apps/web/src/features/logistics/actions.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { revalidatePath } from "next/cache";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const mockInsert = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: "new-1", event_id: "evt-1", template: "parking", title: "Parking", content: "", sort_order: 0 }, error: null }) }) });
const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
const mockDelete = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
const mockSelect = vi.fn();

const mockFrom = vi.fn((table: string) => ({
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
  select: mockSelect,
}));

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({ from: mockFrom })
  ),
}));

describe("Logistics Item Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createLogisticsItem", () => {
    it("inserts a new item and revalidates", async () => {
      const { createLogisticsItem } = await import("./actions");
      const result = await createLogisticsItem("evt-1", "parking", "Parking", "");

      expect(mockFrom).toHaveBeenCalledWith("logistics_items");
      expect(mockInsert).toHaveBeenCalled();
    });
  });

  describe("updateLogisticsItem", () => {
    it("updates an item and revalidates", async () => {
      const { updateLogisticsItem } = await import("./actions");
      await updateLogisticsItem("item-1", { title: "Updated Parking" });

      expect(mockFrom).toHaveBeenCalledWith("logistics_items");
      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe("deleteLogisticsItem", () => {
    it("deletes an item and revalidates", async () => {
      const { deleteLogisticsItem } = await import("./actions");
      await deleteLogisticsItem("item-1");

      expect(mockFrom).toHaveBeenCalledWith("logistics_items");
      expect(mockDelete).toHaveBeenCalled();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run src/features/logistics/actions.test.ts`
Expected: FAIL — new action functions don't exist

**Step 3: Write minimal implementation**

Rewrite `apps/web/src/features/logistics/actions.ts`:

```typescript
"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";
import type { LogisticsItem } from "./queries";

export async function createLogisticsItem(
  eventId: string,
  template: string,
  title: string,
  content: string
): Promise<LogisticsItem> {
  const supabase = await createClient();

  // Get next sort_order
  const { data: existing } = await supabase
    .from("logistics_items")
    .select("sort_order")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("logistics_items")
    .insert({
      event_id: eventId,
      template,
      title,
      content,
      sort_order: nextOrder,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
  return data;
}

export async function updateLogisticsItem(
  itemId: string,
  updates: { title?: string; content?: string }
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("logistics_items")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", itemId);

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}

export async function deleteLogisticsItem(itemId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("logistics_items")
    .delete()
    .eq("id", itemId);

  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}

export async function reorderLogisticsItems(eventId: string, orderedIds: string[]) {
  const supabase = await createClient();

  const updates = orderedIds.map((id, index) =>
    supabase
      .from("logistics_items")
      .update({ sort_order: index, updated_at: new Date().toISOString() })
      .eq("id", id)
  );

  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);

  revalidatePath("/", "layout");
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/web && npx vitest run src/features/logistics/actions.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/features/logistics/actions.ts apps/web/src/features/logistics/actions.test.ts
git commit -m "feat: rewrite logistics actions for item-based CRUD"
```

---

### Task 4: Install react-markdown

**Files:**
- Modify: `apps/web/package.json`

**Step 1: Install the dependency**

Run: `cd apps/web && pnpm add react-markdown`

**Step 2: Verify it installed**

Run: `grep react-markdown apps/web/package.json`
Expected: Shows `"react-markdown": "^X.X.X"` in dependencies

**Step 3: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "chore: add react-markdown dependency"
```

---

### Task 5: Markdown Toolbar Component

**Files:**
- Create: `apps/web/src/features/logistics/components/markdown-toolbar.tsx`
- Create: `apps/web/src/features/logistics/components/markdown-toolbar.test.tsx`

**Step 1: Write the failing test**

Create `apps/web/src/features/logistics/components/markdown-toolbar.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MarkdownTextarea } from "./markdown-toolbar";

describe("MarkdownTextarea", () => {
  it("renders textarea with toolbar buttons", () => {
    render(
      <MarkdownTextarea value="" onChange={vi.fn()} placeholder="Write here..." />
    );

    expect(screen.getByPlaceholderText("Write here...")).toBeDefined();
    expect(screen.getByLabelText("Bold")).toBeDefined();
    expect(screen.getByLabelText("Italic")).toBeDefined();
    expect(screen.getByLabelText("Link")).toBeDefined();
    expect(screen.getByLabelText("List")).toBeDefined();
  });

  it("calls onChange when typing", () => {
    const onChange = vi.fn();
    render(
      <MarkdownTextarea value="" onChange={onChange} placeholder="Write..." />
    );

    fireEvent.change(screen.getByPlaceholderText("Write..."), {
      target: { value: "Hello" },
    });
    expect(onChange).toHaveBeenCalledWith("Hello");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run src/features/logistics/components/markdown-toolbar.test.tsx`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

Create `apps/web/src/features/logistics/components/markdown-toolbar.tsx`:

```typescript
"use client";

import { useRef, useCallback } from "react";
import { Bold, Italic, Link, List } from "lucide-react";

interface MarkdownTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

function wrapSelection(
  textarea: HTMLTextAreaElement,
  before: string,
  after: string,
  onChange: (value: string) => void
) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selected = text.substring(start, end) || "text";
  const newText = text.substring(0, start) + before + selected + after + text.substring(end);
  onChange(newText);

  // Restore cursor after React re-render
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
  });
}

function insertAtCursor(
  textarea: HTMLTextAreaElement,
  insertion: string,
  onChange: (value: string) => void
) {
  const start = textarea.selectionStart;
  const text = textarea.value;
  const newText = text.substring(0, start) + insertion + text.substring(start);
  onChange(newText);

  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(start + insertion.length, start + insertion.length);
  });
}

export function MarkdownTextarea({ value, onChange, placeholder, rows = 6 }: MarkdownTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleBold = useCallback(() => {
    if (textareaRef.current) wrapSelection(textareaRef.current, "**", "**", onChange);
  }, [onChange]);

  const handleItalic = useCallback(() => {
    if (textareaRef.current) wrapSelection(textareaRef.current, "*", "*", onChange);
  }, [onChange]);

  const handleLink = useCallback(() => {
    if (textareaRef.current) {
      const ta = textareaRef.current;
      const selected = ta.value.substring(ta.selectionStart, ta.selectionEnd) || "link text";
      wrapSelection(ta, "[", "](url)", onChange);
    }
  }, [onChange]);

  const handleList = useCallback(() => {
    if (textareaRef.current) insertAtCursor(textareaRef.current, "\n- ", onChange);
  }, [onChange]);

  return (
    <div className="rounded-lg border">
      <div className="flex items-center gap-0.5 border-b px-2 py-1">
        <button
          type="button"
          onClick={handleBold}
          className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted"
          aria-label="Bold"
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleItalic}
          className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted"
          aria-label="Italic"
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleLink}
          className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted"
          aria-label="Link"
        >
          <Link className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={handleList}
          className="flex h-7 w-7 items-center justify-center rounded hover:bg-muted"
          aria-label="List"
        >
          <List className="h-3.5 w-3.5" />
        </button>
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-y bg-transparent px-3 py-2 text-sm outline-none"
      />
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/web && npx vitest run src/features/logistics/components/markdown-toolbar.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/features/logistics/components/markdown-toolbar.tsx apps/web/src/features/logistics/components/markdown-toolbar.test.tsx
git commit -m "feat: add MarkdownTextarea component with formatting toolbar"
```

---

### Task 6: Rewrite Organizer Editor

**Files:**
- Rewrite: `apps/web/src/features/logistics/components/logistics-editor.tsx`

**Step 1: Write the failing test**

Create `apps/web/src/features/logistics/components/logistics-editor.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../actions", () => ({
  createLogisticsItem: vi.fn().mockResolvedValue({
    id: "new-1",
    event_id: "evt-1",
    template: "parking",
    title: "Parking",
    content: "",
    sort_order: 0,
  }),
  updateLogisticsItem: vi.fn().mockResolvedValue(undefined),
  deleteLogisticsItem: vi.fn().mockResolvedValue(undefined),
  reorderLogisticsItems: vi.fn().mockResolvedValue(undefined),
}));

const { LogisticsEditor } = await import("./logistics-editor");

const items = [
  {
    id: "item-1",
    event_id: "evt-1",
    template: "parking" as const,
    title: "Parking Info",
    content: "Free parking at Lot A",
    sort_order: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

describe("LogisticsEditor", () => {
  it("renders existing items", () => {
    render(<LogisticsEditor eventId="evt-1" items={items} />);
    expect(screen.getByDisplayValue("Parking Info")).toBeDefined();
  });

  it("shows empty state when no items", () => {
    render(<LogisticsEditor eventId="evt-1" items={[]} />);
    expect(screen.getByText(/No logistics items yet/)).toBeDefined();
  });

  it("renders Add Item button", () => {
    render(<LogisticsEditor eventId="evt-1" items={[]} />);
    expect(screen.getByText("Add Item")).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run src/features/logistics/components/logistics-editor.test.tsx`
Expected: FAIL — current `LogisticsEditor` expects `initialData: EventLogistics` not `items: LogisticsItem[]`

**Step 3: Write minimal implementation**

Rewrite `apps/web/src/features/logistics/components/logistics-editor.tsx`:

```typescript
"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  GripVertical,
  Save,
  MapPin,
  Car,
  Building,
  Plane,
  Map,
  PartyPopper,
  FileText,
  ChevronDown,
} from "lucide-react";
import { Button, Card, CardContent, Input, ConfirmDialog } from "@attendly/ui/components";
import { MarkdownTextarea } from "./markdown-toolbar";
import {
  createLogisticsItem,
  updateLogisticsItem,
  deleteLogisticsItem,
  reorderLogisticsItems,
} from "../actions";
import type { LogisticsItem } from "../queries";
import { TEMPLATES } from "../queries";

const TEMPLATE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  welcome: PartyPopper,
  venue: MapPin,
  parking: Car,
  hotel: Building,
  travel_info: Plane,
  floor_map: Map,
  custom: FileText,
};

const TEMPLATE_COLORS: Record<string, string> = {
  welcome: "bg-amber-100 text-amber-800",
  venue: "bg-blue-100 text-blue-800",
  parking: "bg-green-100 text-green-800",
  hotel: "bg-purple-100 text-purple-800",
  travel_info: "bg-cyan-100 text-cyan-800",
  floor_map: "bg-rose-100 text-rose-800",
  custom: "bg-gray-100 text-gray-800",
};

function ItemCard({
  item,
  onUpdate,
  onDelete,
}: {
  item: LogisticsItem;
  onUpdate: (id: string, updates: { title?: string; content?: string }) => void;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [content, setContent] = useState(item.content);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const dirty = title !== item.title || content !== item.content;
  const Icon = TEMPLATE_ICONS[item.template] ?? FileText;

  async function handleSave() {
    setSaving(true);
    try {
      await onUpdate(item.id, { title, content });
      toast.success("Item saved");
    } catch {
      toast.error("Failed to save item");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Card>
        <CardContent className="space-y-3 pt-4">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${TEMPLATE_COLORS[item.template] ?? TEMPLATE_COLORS.custom}`}
            >
              <Icon className="h-3 w-3" />
              {TEMPLATES.find((t) => t.value === item.template)?.label ?? "Custom"}
            </span>
            <div className="ml-auto flex items-center gap-1">
              {dirty && (
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  <Save className="mr-1 h-3.5 w-3.5" />
                  {saving ? "Saving..." : "Save"}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Item title"
            className="font-medium"
          />
          <MarkdownTextarea
            value={content}
            onChange={setContent}
            placeholder="Write content using Markdown..."
          />
        </CardContent>
      </Card>
      <ConfirmDialog
        open={confirmDelete}
        title="Delete logistics item?"
        description={`This will permanently delete "${item.title}".`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          setConfirmDelete(false);
          onDelete(item.id);
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}

export function LogisticsEditor({
  eventId,
  items: initialItems,
}: {
  eventId: string;
  items: LogisticsItem[];
}) {
  const [items, setItems] = useState<LogisticsItem[]>(initialItems);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleCreate = useCallback(
    async (template: string) => {
      setMenuOpen(false);
      const label = TEMPLATES.find((t) => t.value === template)?.label ?? "Custom";
      try {
        const newItem = await createLogisticsItem(eventId, template, label, "");
        setItems((prev) => [...prev, newItem]);
        toast.success(`${label} item added`);
      } catch {
        toast.error("Failed to add item");
      }
    },
    [eventId]
  );

  const handleUpdate = useCallback(
    async (id: string, updates: { title?: string; content?: string }) => {
      await updateLogisticsItem(id, updates);
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
      );
    },
    []
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteLogisticsItem(id);
        setItems((prev) => prev.filter((item) => item.id !== id));
        toast.success("Item deleted");
      } catch {
        toast.error("Failed to delete item");
      }
    },
    []
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Logistics</h2>
        <div className="relative">
          <Button onClick={() => setMenuOpen(!menuOpen)}>
            <Plus className="mr-1 h-4 w-4" /> Add Item
            <ChevronDown className="ml-1 h-3.5 w-3.5" />
          </Button>
          {menuOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border bg-card p-1 shadow-lg">
              {TEMPLATES.map((t) => {
                const Icon = TEMPLATE_ICONS[t.value] ?? FileText;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => handleCreate(t.value)}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted"
                  >
                    <Icon className="h-4 w-4" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed py-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            No logistics items yet. Add information like parking, hotels, or
            directions for your attendees.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/web && npx vitest run src/features/logistics/components/logistics-editor.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/features/logistics/components/logistics-editor.tsx apps/web/src/features/logistics/components/logistics-editor.test.tsx
git commit -m "feat: rewrite LogisticsEditor for item-based model with template picker"
```

---

### Task 7: Update Organizer Page

**Files:**
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/logistics/page.tsx`

**Step 1: Update the organizer page to use new query**

Rewrite `apps/web/src/app/(organizer)/events/[eventId]/logistics/page.tsx`:

```typescript
import { getLogisticsItems } from "@/features/logistics/queries";
import { LogisticsEditor } from "@/features/logistics/components/logistics-editor";

export default async function LogisticsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const items = await getLogisticsItems(eventId);
  return <LogisticsEditor eventId={eventId} items={items} />;
}
```

**Step 2: Verify it compiles**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | grep -i logistics || echo "No logistics errors"`
Expected: No type errors related to logistics

**Step 3: Commit**

```bash
git add "apps/web/src/app/(organizer)/events/[eventId]/logistics/page.tsx"
git commit -m "feat: update organizer logistics page for item-based model"
```

---

### Task 8: Rewrite Public Logistics Page

**Files:**
- Rewrite: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/logistics/page.tsx`

**Step 1: Rewrite the public page**

```typescript
import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import {
  MapPin,
  Car,
  Building,
  Plane,
  Map,
  PartyPopper,
  FileText,
} from "lucide-react";
import { createClient } from "@attendly/ui/supabase/server";

const TEMPLATE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  welcome: PartyPopper,
  venue: MapPin,
  parking: Car,
  hotel: Building,
  travel_info: Plane,
  floor_map: Map,
  custom: FileText,
};

export default async function PublicLogisticsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}) {
  const { orgSlug, eventSlug } = await params;
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .single();

  if (!org) notFound();

  const { data: event } = await supabase
    .from("events")
    .select("id, title")
    .eq("organization_id", org.id)
    .eq("slug", eventSlug)
    .eq("status", "published")
    .single();

  if (!event) notFound();

  const { data: items } = await supabase
    .from("logistics_items")
    .select("*")
    .eq("event_id", event.id)
    .order("sort_order", { ascending: true });

  const logisticsItems = items ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold">Logistics</h1>

      {logisticsItems.length === 0 ? (
        <div className="mt-6">
          <p className="text-muted-foreground">
            No logistics information has been shared yet.
          </p>
          <Link
            href={`/${orgSlug}/${eventSlug}`}
            className="mt-3 inline-block text-sm text-primary hover:underline"
          >
            Return to event
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {logisticsItems.map((item) => {
            const Icon = TEMPLATE_ICONS[item.template] ?? FileText;
            return (
              <section key={item.id}>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <Icon className="h-5 w-5 text-primary" /> {item.title}
                </h2>
                <div className="prose prose-sm max-w-none text-muted-foreground">
                  <Markdown>{item.content}</Markdown>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Verify it compiles**

Run: `cd apps/web && npx tsc --noEmit --pretty 2>&1 | grep -i logistics || echo "No logistics errors"`
Expected: No type errors

**Step 3: Commit**

```bash
git add "apps/web/src/app/(public)/[orgSlug]/[eventSlug]/logistics/page.tsx"
git commit -m "feat: rewrite public logistics page with Markdown rendering"
```

---

### Task 9: Sidebar Conditional Visibility

**Files:**
- Modify: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/event-sidebar.tsx`

The sidebar currently always shows the Logistics link under Resources. Now that logistics uses a separate table, we should conditionally show it based on whether any logistics items exist (matching the `hasLogistics` pattern already in `SidebarData`).

**Step 1: Verify `hasLogistics` is already wired**

Read `event-sidebar.tsx` lines 404-412. The sidebar already conditionally renders:
```tsx
{sidebarData.hasLogistics && (
  <NavLink href={...} icon={ClipboardList} label="Logistics" ... />
)}
```

This means the parent layout that computes `sidebarData.hasLogistics` needs to query `logistics_items` instead of the old JSONB column. Find where `hasLogistics` is set and update it.

**Step 2: Find and update the sidebar data computation**

Search for where `hasLogistics` is set. It will be in the layout or page that passes `sidebarData` to `EventSidebar`. Update the query from checking `events.logistics != '{}'` to checking `SELECT EXISTS(SELECT 1 FROM logistics_items WHERE event_id = ?)`.

Run: `grep -rn "hasLogistics" apps/web/src/ --include="*.tsx" --include="*.ts"`

Update the relevant file to compute `hasLogistics` by querying:
```typescript
const { count: logisticsCount } = await supabase
  .from("logistics_items")
  .select("id", { count: "exact", head: true })
  .eq("event_id", eventId);

const hasLogistics = (logisticsCount ?? 0) > 0;
```

**Step 3: Commit**

```bash
git add <modified-file>
git commit -m "feat: update hasLogistics sidebar check to use logistics_items table"
```

---

### Task 10: Final Cleanup and Verification

**Step 1: Remove old types no longer needed**

Check if `LogisticsData`, `EventLogistics`, `Hotel`, `Contact`, `CustomSection` types are still imported anywhere outside the logistics feature. If not, they were already replaced in Task 2. Verify:

Run: `grep -rn "LogisticsData\|EventLogistics\|from.*logistics/queries" apps/web/src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v ".test."`

If the website builder's `venue-section.tsx` imports from logistics queries, update it to no longer depend on logistics types (it only needs `venue_description` and `venue_map_url` which are on the events table).

**Step 2: Run all logistics tests**

Run: `cd apps/web && npx vitest run src/features/logistics/`
Expected: All tests pass

**Step 3: Run type check**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No type errors

**Step 4: Commit any cleanup**

```bash
git add -A
git commit -m "chore: remove old logistics types and fix remaining imports"
```

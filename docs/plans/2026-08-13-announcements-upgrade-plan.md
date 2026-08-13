# Announcements Upgrade Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade Attendly's Announcements to full Whova parity — rich text editor, 7 audience types, modal composer, drafts/sent split, templates, test send, pagination.

**Architecture:** Migration adds new columns + templates table. Tiptap replaces textarea. Composer becomes modal dialog. List splits into Drafts/Sent sections with pagination. `getSegmentedRecipients` expanded for all 7 audience types.

**Tech Stack:** Next.js 16, React 19, Supabase, Tiptap, TypeScript, Tailwind 4

**Design doc:** `docs/plans/2026-08-13-announcements-upgrade-design.md`

---

### Task 1: Database Migration

**Files:**
- Create: `packages/supabase/migrations/058_announcements_upgrade.sql`

**Step 1: Write the migration**

```sql
-- 058_announcements_upgrade.sql
-- Add sender/reply-to/signature columns to announcements
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS sender_name TEXT,
  ADD COLUMN IF NOT EXISTS reply_to_email TEXT,
  ADD COLUMN IF NOT EXISTS signature TEXT;

-- Templates table
CREATE TABLE IF NOT EXISTS public.announcement_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'custom' CHECK (type IN ('quick_reminder', 'custom')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.announcement_templates ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcement_templates TO authenticated;

CREATE POLICY "Org members can manage templates" ON public.announcement_templates
  FOR ALL TO authenticated
  USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));

CREATE INDEX idx_announcement_templates_org ON public.announcement_templates(organization_id);
CREATE INDEX idx_announcement_templates_event ON public.announcement_templates(event_id);
```

**Step 2: Run the migration**

Run: `cd packages/supabase && npx supabase migration up`
Expected: Migration applied successfully

**Step 3: Commit**

```bash
git add packages/supabase/migrations/058_announcements_upgrade.sql
git commit -m "feat: add announcements upgrade migration (sender, templates)"
```

---

### Task 2: Install Tiptap

**Step 1: Install dependencies**

Run: `cd apps/web && pnpm add @tiptap/react @tiptap/starter-kit @tiptap/extension-underline @tiptap/extension-text-align @tiptap/extension-color @tiptap/extension-text-style @tiptap/extension-highlight @tiptap/extension-placeholder`

**Step 2: Create RichTextEditor component**

**Files:**
- Create: `apps/web/src/shared/components/ui/rich-text-editor.tsx`

```tsx
"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Palette,
  Highlighter,
  RemoveFormatting,
} from "lucide-react";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

const COLORS = ["#000000", "#e03131", "#2f9e44", "#1971c2", "#f08c00", "#7048e8"];
const HIGHLIGHTS = ["#fff3bf", "#d3f9d8", "#d0ebff", "#ffe3e3", "#e8d0ff"];

function ToolbarButton({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`rounded p-1.5 transition-colors ${
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({ content, onChange, placeholder, readOnly }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder: placeholder ?? "Write your message..." }),
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  if (!editor) return null;

  if (readOnly) {
    return (
      <div className="prose prose-sm max-w-none rounded-lg border bg-muted/10 p-4">
        <EditorContent editor={editor} />
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <div className="flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5">
        <ToolbarButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-border" />

        <ToolbarButton active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} title="Align left">
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} title="Align center">
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} title="Align right">
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive({ textAlign: "justify" })} onClick={() => editor.chain().focus().setTextAlign("justify").run()} title="Justify">
          <AlignJustify className="h-4 w-4" />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-border" />

        <div className="relative group">
          <ToolbarButton active={false} onClick={() => {}} title="Text color">
            <Palette className="h-4 w-4" />
          </ToolbarButton>
          <div className="absolute left-0 top-full z-10 hidden rounded-lg border bg-card p-2 shadow-lg group-hover:flex gap-1">
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => editor.chain().focus().setColor(color).run()}
                className="h-5 w-5 rounded-full border"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <div className="relative group">
          <ToolbarButton active={false} onClick={() => {}} title="Highlight">
            <Highlighter className="h-4 w-4" />
          </ToolbarButton>
          <div className="absolute left-0 top-full z-10 hidden rounded-lg border bg-card p-2 shadow-lg group-hover:flex gap-1">
            {HIGHLIGHTS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => editor.chain().focus().toggleHighlight({ color }).run()}
                className="h-5 w-5 rounded-full border"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <div className="mx-1 h-5 w-px bg-border" />

        <ToolbarButton active={false} onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Clear formatting">
          <RemoveFormatting className="h-4 w-4" />
        </ToolbarButton>
      </div>

      <div className="min-h-[200px] px-4 py-3">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
```

**Step 3: Verify Tiptap renders**

Run: `cd apps/web && pnpm dev` — confirm no build errors.

**Step 4: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml apps/web/src/shared/components/ui/rich-text-editor.tsx
git commit -m "feat: add Tiptap rich text editor component"
```

---

### Task 3: Update Queries (Pagination + Split)

**Files:**
- Modify: `apps/web/src/features/announcements/queries.ts`

**Step 1: Update `getAnnouncements` to return split drafts/sent with pagination**

Replace the existing `getAnnouncements` function and add `getRecipientCount`:

```typescript
import { createClient } from "@attendly/ui/supabase/server";

export type Announcement = {
  id: string;
  event_id: string;
  author_id: string;
  subject: string;
  body: string;
  target_audience: { type: string; ticket_type_ids?: string[]; category?: string; session_id?: string; attendee_ids?: string[]; excluded_categories?: string[] };
  channels: string[];
  status: "draft" | "scheduled" | "sent";
  sender_name: string | null;
  reply_to_email: string | null;
  signature: string | null;
  scheduled_for: string | null;
  sent_at: string | null;
  read_count: number;
  created_at: string;
  updated_at: string;
};

export type AnnouncementTemplate = {
  id: string;
  organization_id: string;
  event_id: string | null;
  name: string;
  subject: string;
  body: string;
  type: "quick_reminder" | "custom";
  created_at: string;
};

export async function getAnnouncements(
  eventId: string,
  opts?: { page?: number; pageSize?: number }
): Promise<{ drafts: Announcement[]; sent: Announcement[]; totalDrafts: number; totalSent: number }> {
  const supabase = await createClient();
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 10;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const [draftsRes, sentRes, draftsCount, sentCount] = await Promise.all([
    supabase
      .from("announcements")
      .select("*")
      .eq("event_id", eventId)
      .eq("status", "draft")
      .order("created_at", { ascending: false })
      .range(from, to),
    supabase
      .from("announcements")
      .select("*")
      .eq("event_id", eventId)
      .eq("status", "sent")
      .order("sent_at", { ascending: false })
      .range(from, to),
    supabase
      .from("announcements")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("status", "draft"),
    supabase
      .from("announcements")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("status", "sent"),
  ]);

  return {
    drafts: (draftsRes.data ?? []) as Announcement[],
    sent: (sentRes.data ?? []) as Announcement[],
    totalDrafts: draftsCount.count ?? 0,
    totalSent: sentCount.count ?? 0,
  };
}

export async function getAnnouncement(id: string): Promise<Announcement | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("announcements").select("*").eq("id", id).single();
  if (error || !data) return null;
  return data as Announcement;
}

export async function getAnnouncementsForAttendee(eventId: string): Promise<Announcement[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("announcements")
    .select("*")
    .eq("event_id", eventId)
    .eq("status", "sent")
    .order("sent_at", { ascending: false });
  return (data ?? []) as Announcement[];
}

export async function getUnreadCount(eventIds: string[]): Promise<number> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { data: announcements } = await supabase
    .from("announcements")
    .select("id")
    .in("event_id", eventIds)
    .eq("status", "sent");
  if (!announcements || announcements.length === 0) return 0;
  const { data: reads } = await supabase
    .from("announcement_reads")
    .select("announcement_id")
    .eq("user_id", user.id);
  const readIds = new Set((reads ?? []).map((r) => r.announcement_id));
  return announcements.filter((a) => !readIds.has(a.id)).length;
}

export async function getRecipientCount(
  eventId: string,
  audience: { type: string; ticket_type_ids?: string[]; category?: string; session_id?: string; attendee_ids?: string[]; excluded_categories?: string[] }
): Promise<number> {
  const supabase = await createClient();

  if (audience.type === "manual" && audience.attendee_ids) {
    return audience.attendee_ids.length;
  }

  let query = supabase
    .from("registrations")
    .select("*", { count: "exact", head: true })
    .eq("event_id", eventId)
    .in("status", ["confirmed", "checked_in"]);

  if (audience.type === "ticket_types" && audience.ticket_type_ids?.length) {
    query = query.in("ticket_type_id", audience.ticket_type_ids);
  } else if (audience.type === "category" && audience.category) {
    query = query.eq("category", audience.category);
  } else if (audience.type === "exclude_categories" && audience.excluded_categories?.length) {
    query = query.not("category", "in", `(${audience.excluded_categories.join(",")})`);
  }

  // session_attendees requires a different approach — count via session_rsvps
  if (audience.type === "session_attendees" && audience.session_id) {
    const { count } = await supabase
      .from("session_rsvps")
      .select("*", { count: "exact", head: true })
      .eq("session_id", audience.session_id)
      .eq("status", "confirmed");
    return count ?? 0;
  }

  const { count } = await query;
  return count ?? 0;
}

export async function getTemplates(orgId: string, eventId: string): Promise<AnnouncementTemplate[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("announcement_templates")
    .select("*")
    .eq("organization_id", orgId)
    .or(`event_id.eq.${eventId},event_id.is.null`)
    .order("created_at", { ascending: false });
  return (data ?? []) as AnnouncementTemplate[];
}

export async function getOrgTemplates(orgId: string, excludeEventId: string): Promise<AnnouncementTemplate[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("announcement_templates")
    .select("*")
    .eq("organization_id", orgId)
    .neq("event_id", excludeEventId)
    .not("event_id", "is", null)
    .order("created_at", { ascending: false });
  return (data ?? []) as AnnouncementTemplate[];
}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/announcements/queries.ts
git commit -m "feat: update announcement queries with pagination, split, templates"
```

---

### Task 4: Update Actions (New Fields + New Actions)

**Files:**
- Modify: `apps/web/src/features/announcements/actions.ts`

**Step 1: Update existing actions and add new ones**

Update `createAnnouncement` and `sendAnnouncement` to include new fields. Add `sendTestAnnouncement`, `duplicateAnnouncement`, and template CRUD.

See design doc for full spec. Key changes:

- `createAnnouncement` — accept `sender_name`, `reply_to_email`, `signature`
- `updateAnnouncement` — accept all fields for draft editing
- `sendAnnouncement` — use `sender_name`/`reply_to_email` in email, append `signature`
- `sendTestAnnouncement` — new: send to current user only, no status change
- `duplicateAnnouncement` — new: copy sent announcement into new draft
- `createTemplate` — new: save as template
- `deleteTemplate` — new: remove template
- Expand `getSegmentedRecipients` call to handle all 7 audience types

**Step 2: Commit**

```bash
git add apps/web/src/features/announcements/actions.ts
git commit -m "feat: update announcement actions with new fields and template CRUD"
```

---

### Task 5: Expand Segment Recipients

**Files:**
- Modify: `apps/web/src/features/emails/lib/segments.ts`

**Step 1: Add category, session, manual, exclude support**

Add new filter fields to `SegmentFilters`:

```typescript
type SegmentFilters = {
  ticket_type_ids?: string[];
  statuses?: string[];
  checked_in?: boolean;
  custom_field_filters?: { field_id: string; value: string }[];
  min_check_ins?: number;
  category?: string;
  excluded_categories?: string[];
  session_id?: string;
  attendee_ids?: string[];
};
```

Add filtering logic:
- `category` — `.eq("category", category)`
- `excluded_categories` — `.not("category", "in", ...)`
- `attendee_ids` — `.in("id", attendee_ids)`
- `session_id` — join with `session_rsvps` to get user_ids, then match registrations

**Step 2: Commit**

```bash
git add apps/web/src/features/emails/lib/segments.ts
git commit -m "feat: expand segment recipients for all 7 audience types"
```

---

### Task 6: Announcement Composer Modal

**Files:**
- Rewrite: `apps/web/src/features/announcements/components/announcement-composer.tsx`

**Step 1: Rewrite composer as modal dialog**

Key changes:
- Wrap in `ModalOverlay` (same pattern as `DocumentForm`)
- Accept `open`, `onClose`, `draft?` (for editing), `template?` (for pre-fill) props
- Add `sender_name`, `reply_to_email` fields
- Replace `<textarea>` with `<RichTextEditor>` (Tiptap)
- 7 audience radio options with conditional sub-selectors
- Channel checkboxes (In-App, Email, Push)
- Auto-signature preview section
- 4 action buttons: Cancel, Send myself test, Save draft, Send

**Step 2: Commit**

```bash
git add apps/web/src/features/announcements/components/announcement-composer.tsx
git commit -m "feat: rewrite announcement composer as modal with rich text"
```

---

### Task 7: Announcement List (Drafts/Sent Split)

**Files:**
- Rewrite: `apps/web/src/features/announcements/components/announcement-list.tsx`

**Step 1: Rewrite list with separate Drafts and Sent sections**

Key changes:
- Accept `drafts`, `sent`, `totalDrafts`, `totalSent`, `page` props
- Drafts table: Subject, Send to, Time created, Actions (Edit, Delete)
  - Edit button opens composer modal with draft data
- Sent table: Subject, Sent to, Time sent, Actions dropdown
  - Actions: View details, Copy and compose new, Delete
- Sortable column headers (click to sort)
- Pagination component at bottom of each table
- Empty states with CTA buttons

**Step 2: Create AnnouncementDetailModal component**

**Files:**
- Create: `apps/web/src/features/announcements/components/announcement-detail-modal.tsx`

Read-only modal showing full announcement with "Copy and compose new" button.

**Step 3: Commit**

```bash
git add apps/web/src/features/announcements/components/announcement-list.tsx
git add apps/web/src/features/announcements/components/announcement-detail-modal.tsx
git commit -m "feat: split announcement list into drafts/sent with pagination"
```

---

### Task 8: Template Picker Components

**Files:**
- Create: `apps/web/src/features/announcements/components/template-picker.tsx`

**Step 1: Create TemplatePicker modal**

Shows a list of past sent announcements or org templates. Clicking one loads it into the composer.

Two modes:
- "Reuse past" — shows sent announcements from current event
- "From other organizers" — shows templates from other events in org

**Step 2: Commit**

```bash
git add apps/web/src/features/announcements/components/template-picker.tsx
git commit -m "feat: add template picker for reuse and cross-event sharing"
```

---

### Task 9: Update Page

**Files:**
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/announcements/page.tsx`

**Step 1: Update page to use new components**

- Fetch paginated announcements (drafts + sent split)
- Fetch ticket types, sessions, categories for audience selectors
- Render stats bar, 4 action buttons, Drafts section, Sent section
- Wire up composer modal state (open/close, edit draft, template pre-fill)

**Step 2: Commit**

```bash
git add apps/web/src/app/(organizer)/events/[eventId]/announcements/page.tsx
git commit -m "feat: update announcements page with new layout and modal composer"
```

---

### Task 10: Tests

**Files:**
- Update: `apps/web/src/features/announcements/actions.test.ts`
- Update: `apps/web/src/features/announcements/components/announcement-composer.test.tsx`

**Step 1: Update action tests**

Add tests for:
- `createAnnouncement` with new fields (sender_name, reply_to_email, signature)
- `duplicateAnnouncement`
- `sendTestAnnouncement`
- Template CRUD actions

**Step 2: Update component tests**

Add tests for:
- Composer modal opens/closes
- Rich text editor renders
- Audience selector shows 7 options
- Save draft / Send flow
- Edit draft pre-fills form

**Step 3: Commit**

```bash
git add apps/web/src/features/announcements/actions.test.ts
git add apps/web/src/features/announcements/components/announcement-composer.test.tsx
git commit -m "test: update announcement tests for upgrade"
```

---

### Task 11: Playwright UI Test

**Files:**
- Create: `docs/ux-reports/2026-08-13-announcements-upgrade.md`

**Step 1: Run Playwright UI testing skill**

Use `playwright-ui-testing` skill to:
- Verify announcements page loads
- Test 4 action buttons open correct modals
- Test composer fields (rich text, audience, sender, channels)
- Test save draft → appears in Drafts table
- Test edit draft → re-opens pre-filled
- Test send → moves to Sent table
- Test actions dropdown on sent items
- Test detail view modal
- Test pagination
- Generate UX report

**Step 2: Commit**

```bash
git add docs/ux-reports/2026-08-13-announcements-upgrade.md
git commit -m "docs: add announcements upgrade UX report"
```

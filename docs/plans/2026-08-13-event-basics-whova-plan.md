# Event Basics (Whova Parity) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild event creation and settings pages to match Whova's comprehensive "Basics" page with all fields, rich text editor, Google Maps location picker, and sectioned layout.

**Architecture:** Single `EventBasicsForm` component used by both create (`/events/new`) and settings (`/events/[eventId]/settings`) pages. New columns added to `events` table via migration 050. Three new shared components: `RichTextEditor` (Tiptap), `LocationPicker` (Google Maps), `TagInput`.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind 4, Supabase, Tiptap (rich text), @vis.gl/react-google-maps (maps + Places), sonner toasts.

**Design doc:** `docs/plans/2026-08-13-event-basics-whova-design.md`

---

## Task 1: Database Migration (050)

**Files:**
- Create: `packages/supabase/migrations/050_event_basics.sql`

**Step 1: Write migration**

```sql
-- =============================================================================
-- Event Basics - Whova Parity
-- Adds comprehensive event information fields matching Whova's Basics page
-- =============================================================================

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS abbreviation TEXT,
  ADD COLUMN IF NOT EXISTS max_attendees INT,
  ADD COLUMN IF NOT EXISTS welcome_message TEXT,
  ADD COLUMN IF NOT EXISTS airport_ride_sharing TEXT NOT NULL DEFAULT 'none'
    CHECK (airport_ride_sharing IN ('enabled', 'provided', 'none')),
  ADD COLUMN IF NOT EXISTS event_website_url TEXT,
  ADD COLUMN IF NOT EXISTS logo TEXT,
  ADD COLUMN IF NOT EXISTS twitter_hashtags TEXT,
  ADD COLUMN IF NOT EXISTS post_event_summary BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS generate_interests BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS organization_name TEXT,
  ADD COLUMN IF NOT EXISTS attendee_origin TEXT
    CHECK (attendee_origin IS NULL OR attendee_origin IN ('local', 'national', 'global')),
  ADD COLUMN IF NOT EXISTS topic_tags JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS organization_type JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS event_type TEXT,
  ADD COLUMN IF NOT EXISTS event_type_other TEXT,
  ADD COLUMN IF NOT EXISTS location_data JSONB NOT NULL DEFAULT '{}';

-- No new RLS needed - events table already has policies
-- No new grants needed - events table already has grants

COMMENT ON COLUMN public.events.abbreviation IS 'Short name for compact displays (max 30 chars)';
COMMENT ON COLUMN public.events.location_data IS 'Structured location from Google Places: {place_id, formatted_address, venue_name, city, state, zip, country, lat, lng}';
COMMENT ON COLUMN public.events.topic_tags IS 'JSON array of topic tag strings';
COMMENT ON COLUMN public.events.organization_type IS 'JSON array of org type strings: association, nonprofit, government, corporate, university, other';
```

**Step 2: Apply migration**

```bash
docker exec -i supabase_db_attendly psql -U postgres -d postgres < packages/supabase/migrations/050_event_basics.sql
```

Expected: No errors.

**Step 3: Commit**

```bash
git add packages/supabase/migrations/050_event_basics.sql
git commit -m "feat: add event basics columns for Whova parity (migration 050)"
```

---

## Task 2: Install Dependencies

**Files:**
- Modify: `apps/web/package.json`

**Step 1: Install Tiptap packages**

```bash
cd apps/web && pnpm add @tiptap/react @tiptap/pm @tiptap/starter-kit @tiptap/extension-underline @tiptap/extension-text-align @tiptap/extension-link @tiptap/extension-image @tiptap/extension-placeholder
```

**Step 2: Install Google Maps package**

```bash
cd apps/web && pnpm add @vis.gl/react-google-maps
```

**Step 3: Add Google Maps API key to .env.local**

Add to `apps/web/.env.local`:
```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<user_must_provide>
```

Note: Ask user for their Google Maps API key. Needs Places API and Maps JavaScript API enabled.

**Step 4: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "feat: add tiptap and google maps dependencies"
```

---

## Task 3: RichTextEditor Component

**Files:**
- Create: `apps/web/src/shared/components/rich-text-editor.tsx`

**Step 1: Create the component**

Build a Tiptap-based rich text editor with:
- Toolbar: Bold, Italic, Underline, Font size (dropdown), Text align (left/center/right), Link, Image, Code, Ordered list, Unordered list, Blockquote
- Toolbar styled to match our design system (muted background, rounded buttons)
- Controlled: `value` (HTML string), `onChange` callback
- `placeholder` prop
- Min height ~150px, max height ~400px with scroll
- Border and focus ring matching our Input component style

```tsx
"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Image as ImageIcon,
  Code,
  List,
  ListOrdered,
  Quote,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false }),
      Image,
      Placeholder.configure({ placeholder: placeholder ?? "Write something..." }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Sync external value changes
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  }, [value, editor]);

  if (!editor) return null;

  function ToolbarButton({
    onClick,
    active,
    children,
    title,
  }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
    title: string;
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title}
        className={`rounded p-1.5 transition-colors ${
          active
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        {children}
      </button>
    );
  }

  function handleLink() {
    const url = window.prompt("Enter URL:");
    if (url) {
      editor!.chain().focus().setLink({ href: url }).run();
    }
  }

  function handleImage() {
    const url = window.prompt("Enter image URL:");
    if (url) {
      editor!.chain().focus().setImage({ src: url }).run();
    }
  }

  return (
    <div className="rounded-lg border bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/30 px-2 py-1.5">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="Underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-border" />

        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          active={editor.isActive({ textAlign: "left" })}
          title="Align left"
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          active={editor.isActive({ textAlign: "center" })}
          title="Align center"
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          active={editor.isActive({ textAlign: "right" })}
          title="Align right"
        >
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-border" />

        <ToolbarButton onClick={handleLink} active={editor.isActive("link")} title="Insert link">
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={handleImage} title="Insert image">
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive("code")}
          title="Code"
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-border" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Bullet list"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Ordered list"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          title="Blockquote"
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Editor */}
      <EditorContent
        editor={editor}
        className="prose prose-sm max-w-none px-4 py-3 min-h-[150px] max-h-[400px] overflow-y-auto focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0"
      />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/shared/components/rich-text-editor.tsx
git commit -m "feat: add RichTextEditor component (Tiptap)"
```

---

## Task 4: LocationPicker Component

**Files:**
- Create: `apps/web/src/shared/components/location-picker.tsx`

**Step 1: Create the component**

Build a Google Maps location picker with:
- Google Places Autocomplete text input
- Embedded Google Map showing selected location pin
- Displays structured address: venue name, address lines, city, state, zip, country
- "Open in Maps" link (external link to Google Maps)
- "Reset location" button to clear
- Props: `value: LocationData`, `onChange: (data: LocationData) => void`

`LocationData` type:
```ts
export type LocationData = {
  place_id?: string;
  formatted_address?: string;
  venue_name?: string;
  address_lines?: string[];
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  lat?: number;
  lng?: number;
};
```

The component should:
1. Render an autocomplete input using Google Places API
2. On place selection, parse the address components into structured `LocationData`
3. Show a map with a marker at the selected coordinates
4. Display parsed address fields below the map (read-only)
5. If no API key is configured, fall back to manual text inputs for venue_name and venue_address

**Step 2: Commit**

```bash
git add apps/web/src/shared/components/location-picker.tsx
git commit -m "feat: add LocationPicker component (Google Maps + Places)"
```

---

## Task 5: TagInput Component

**Files:**
- Create: `apps/web/src/shared/components/tag-input.tsx`

**Step 1: Create the component**

Build a tag input that:
- Shows existing tags as colored badges
- Text input for adding new tags (Enter to add)
- X button on each tag to remove
- Props: `value: string[]`, `onChange: (tags: string[]) => void`, `placeholder?: string`
- Prevents duplicate tags
- Styled to match our design system

```tsx
"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Badge, Input } from "@attendly/ui/components";

export function TagInput({
  value,
  onChange,
  placeholder = "Add a tag and press Enter",
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const tag = input.trim();
      if (tag && !value.includes(tag)) {
        onChange([...value, tag]);
      }
      setInput("");
    }
    if (e.key === "Backspace" && !input && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((tag) => (
          <Badge key={tag} variant="info" className="gap-1 pr-1">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="rounded-full p-0.5 hover:bg-black/10"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/shared/components/tag-input.tsx
git commit -m "feat: add TagInput component"
```

---

## Task 6: EventBasicsForm Component

**Files:**
- Create: `apps/web/src/features/events/components/event-basics-form.tsx`

**Step 1: Create the form component**

This is the main form, used by both `/events/new` and `/events/[eventId]/settings`. It renders a single scrollable page with all Whova sections.

Props:
```ts
interface EventBasicsFormProps {
  mode: "create" | "edit";
  event?: EventData; // pre-filled data when editing
  onSubmit: (data: EventFormData) => Promise<void>;
}
```

Sections (each in a `<Card>` with heading):

**Section 1: Basic Details**
- Event Name (Input, 150 char counter)
- Event Name Abbreviation (Input, 30 char counter, helper text)
- Start Date / End Date (side by side date inputs)
- Number of Attendees (number input)
- Location (LocationPicker component)
- Time Zone (select dropdown, auto-set from location)
- Description (RichTextEditor)
  - Helper: "This description is visible to all users, making it a good marketing opportunity for your event!"

**Section 2: Welcome Attendees**
- Welcome message (Textarea, 10000 char counter)
- Helper text

**Section 3: Airport Ride Sharing**
- Radio group with 3 options (styled radio cards)

**Section 4: Event Branding**
- Event Website URL (Input type url)
- Logo (ImageUpload component, folder="logos")
- Cover Image (ImageUpload component, folder="covers") - keep existing
- Twitter Hashtag(s) (Input, helper about comma separation)

**Section 5: Post-event Analytics**
- Radio: Yes/No for AI summary

**Section 6: Spark Conversation**
- Radio: Yes/No for event-specific interests

**Section 7: Let's Promote Your Event**
- Organization name (Input, 100 char counter)
- Attendee origin (3 radio cards: Local / National / Global)
- Topic tags (TagInput component)
- Organization type (checkbox group: Association, Nonprofit, Government, Corporate, University, Other)
- Event type (radio group: Academic conference, Business/Professional conference, Expo or trade show, Internal event or meeting, Workshop or seminar, Career fair, Other + text input)

**Bottom: Save/Create button**
- In create mode: "Create Event" with sparkle icon
- In edit mode: "Save Changes"
- Helper: "(Don't worry, you can come back and make changes later)"

Each section should have a `<Card>` wrapper with a section title like Whova's layout.

Character counter helper:
```tsx
function CharCounter({ value, max }: { value: string; max: number }) {
  return (
    <span className="text-xs text-muted-foreground">
      {value.length}/{max}
    </span>
  );
}
```

Radio card helper for styled radio options:
```tsx
function RadioCard({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${
        selected
          ? "border-primary bg-primary/5 text-foreground"
          : "border-border text-muted-foreground hover:border-primary/30"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 ${
            selected ? "border-primary bg-primary" : "border-muted-foreground/40"
          }`}
        >
          {selected && (
            <div className="flex h-full items-center justify-center">
              <div className="h-1.5 w-1.5 rounded-full bg-white" />
            </div>
          )}
        </div>
        {children}
      </div>
    </button>
  );
}
```

Form state should use `useState` with a flat object containing all fields. On submit, call `onSubmit(formData)`.

**Step 2: Commit**

```bash
git add apps/web/src/features/events/components/event-basics-form.tsx
git commit -m "feat: add EventBasicsForm component with all Whova sections"
```

---

## Task 7: Create Event Page (Rebuild)

**Files:**
- Modify: `apps/web/src/app/(organizer)/events/new/page.tsx`

**Step 1: Rewrite the create event page**

Replace the 3-step wizard with `EventBasicsForm` in create mode.

```tsx
"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/client";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { EventBasicsForm } from "@/features/events/components/event-basics-form";
import type { EventFormData } from "@/features/events/components/event-basics-form";

export default function NewEventPage() {
  const router = useRouter();

  async function handleCreate(data: EventFormData) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("You must be logged in");
      return;
    }

    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("role", "owner")
      .single();

    if (!membership) {
      toast.error("No organization found");
      return;
    }

    // Auto-generate slug from title
    const slug = data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const { data: event, error } = await supabase
      .from("events")
      .insert({
        organization_id: membership.organization_id,
        title: data.title,
        slug,
        abbreviation: data.abbreviation || null,
        description: data.description || null,
        start_date: new Date(data.start_date).toISOString(),
        end_date: new Date(data.end_date).toISOString(),
        timezone: data.timezone,
        max_attendees: data.max_attendees || null,
        venue_name: data.location_data?.venue_name || null,
        venue_address: data.location_data?.formatted_address || null,
        location_data: data.location_data ?? {},
        welcome_message: data.welcome_message || null,
        airport_ride_sharing: data.airport_ride_sharing,
        event_website_url: data.event_website_url || null,
        logo: data.logo || null,
        cover_image: data.cover_image || null,
        twitter_hashtags: data.twitter_hashtags || null,
        post_event_summary: data.post_event_summary,
        generate_interests: data.generate_interests,
        organization_name: data.organization_name || null,
        attendee_origin: data.attendee_origin || null,
        topic_tags: data.topic_tags,
        organization_type: data.organization_type,
        event_type: data.event_type || null,
        event_type_other: data.event_type_other || null,
        is_virtual: false,
        status: "draft",
      })
      .select("id")
      .single();

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Event created!");
    router.push(`/events/${event.id}`);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-serif">Create Event</h1>
            <p className="text-sm text-muted-foreground">
              Fill in your event information below. You can come back and make changes later.
            </p>
          </div>
        </div>
      </div>

      <EventBasicsForm mode="create" onSubmit={handleCreate} />
    </div>
  );
}
```

Keep the template selection feature at the top if templates exist (from existing code).

**Step 2: Commit**

```bash
git add apps/web/src/app/\(organizer\)/events/new/page.tsx
git commit -m "feat: rebuild create event page with Whova-style basics form"
```

---

## Task 8: Settings Page (Rebuild)

**Files:**
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/settings/settings-form.tsx`
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/settings/page.tsx`

**Step 1: Update settings page to fetch all new columns**

The page already does `select("*")` so it will pick up new columns automatically. Just ensure the type is updated.

**Step 2: Rewrite settings-form.tsx**

Replace the current flat form with `EventBasicsForm` in edit mode, keeping the Publishing, Duplicate, Template, and Danger Zone sections below it.

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, FileDown } from "lucide-react";
import { createClient } from "@attendly/ui/supabase/client";
import { duplicateEvent } from "@/features/events/actions";
import { saveAsTemplate } from "@/features/templates/actions";
import { Input, Button, Badge, Card, useConfirm } from "@attendly/ui/components";
import { EventBasicsForm } from "@/features/events/components/event-basics-form";
import type { EventFormData } from "@/features/events/components/event-basics-form";

// Accept the full event row from Supabase
export function EventSettingsForm({ event }: { event: Record<string, unknown> & { id: string; status: string } }) {
  const router = useRouter();
  const [status, setStatus] = useState(event.status);
  const [duplicating, setDuplicating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirm();

  async function handleSave(data: EventFormData) {
    const supabase = createClient();

    const slug = (data.title || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const { error } = await supabase
      .from("events")
      .update({
        title: data.title,
        slug,
        abbreviation: data.abbreviation || null,
        description: data.description || null,
        start_date: new Date(data.start_date).toISOString(),
        end_date: new Date(data.end_date).toISOString(),
        timezone: data.timezone,
        max_attendees: data.max_attendees || null,
        venue_name: data.location_data?.venue_name || null,
        venue_address: data.location_data?.formatted_address || null,
        location_data: data.location_data ?? {},
        welcome_message: data.welcome_message || null,
        airport_ride_sharing: data.airport_ride_sharing,
        event_website_url: data.event_website_url || null,
        logo: data.logo || null,
        cover_image: data.cover_image || null,
        twitter_hashtags: data.twitter_hashtags || null,
        post_event_summary: data.post_event_summary,
        generate_interests: data.generate_interests,
        organization_name: data.organization_name || null,
        attendee_origin: data.attendee_origin || null,
        topic_tags: data.topic_tags,
        organization_type: data.organization_type,
        event_type: data.event_type || null,
        event_type_other: data.event_type_other || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", event.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Event updated");
    router.refresh();
  }

  // ... keep existing handleStatusChange, handleDelete, handleDuplicate, handleSaveTemplate ...

  return (
    <div className="space-y-8">
      <EventBasicsForm mode="edit" event={event} onSubmit={handleSave} />

      {/* Publishing - keep existing */}
      {/* Duplicate - keep existing */}
      {/* Save as Template - keep existing */}
      {/* Danger Zone - keep existing */}
      {confirmDialog}
    </div>
  );
}
```

Move the Publishing, Duplicate, Template, and Danger Zone `<Card>` sections from the existing file into this new version. They stay the same.

**Step 3: Commit**

```bash
git add apps/web/src/app/\(organizer\)/events/\[eventId\]/settings/settings-form.tsx
git add apps/web/src/app/\(organizer\)/events/\[eventId\]/settings/page.tsx
git commit -m "feat: rebuild settings page with Whova-style basics form"
```

---

## Task 9: Create events feature module

**Files:**
- Create: `apps/web/src/features/events/components/` directory (if not exists)

The `EventBasicsForm` is created in Task 6. This task ensures the feature module directory exists and creates an `index.ts` barrel export if needed.

Check if `apps/web/src/features/events/` exists. If not, create:
- `apps/web/src/features/events/actions.ts` (already exists per earlier grep)
- Any missing directory structure

**Step 1: Verify directory exists**

```bash
ls -la apps/web/src/features/events/ 2>/dev/null || mkdir -p apps/web/src/features/events/components
```

**Step 2: Commit if new dirs created**

```bash
git add apps/web/src/features/events/
git commit -m "chore: ensure events feature module directory"
```

---

## Task 10: Timezone Data + Helpers

**Files:**
- Create: `apps/web/src/shared/utils/timezones.ts`

**Step 1: Create timezone list and helpers**

```ts
export const TIMEZONE_OPTIONS = Intl.supportedValuesOf("timeZone").map((tz) => ({
  value: tz,
  label: `(${getUTCOffset(tz)}) ${tz.replace(/_/g, " ")}`,
}));

function getUTCOffset(tz: string): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "shortOffset",
  });
  const parts = formatter.formatToParts(now);
  const offset = parts.find((p) => p.type === "timeZoneName")?.value ?? "UTC";
  return offset;
}

export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 16);
}
```

**Step 2: Commit**

```bash
git add apps/web/src/shared/utils/timezones.ts
git commit -m "feat: add timezone utilities"
```

---

## Task 11: Test & Polish

**Step 1: Run TypeScript check**

```bash
cd apps/web && pnpm tsc --noEmit
```

Fix any type errors.

**Step 2: Test create event flow**

1. Navigate to `/events/new`
2. Verify all sections render
3. Fill in basic fields and create event
4. Verify event is created with all fields in DB

**Step 3: Test settings flow**

1. Navigate to `/events/[eventId]/settings`
2. Verify all fields pre-populate
3. Edit fields and save
4. Verify changes persist

**Step 4: Test rich text editor**

1. Type formatted text (bold, italic, lists)
2. Verify HTML is saved to description
3. Verify it renders when editing again

**Step 5: Test location picker**

1. Type an address
2. Verify Google Places autocomplete suggestions
3. Select a location
4. Verify map shows the pin
5. Verify structured address displays
6. Verify timezone auto-sets

**Step 6: Fix any issues and commit**

```bash
git add -A
git commit -m "fix: polish event basics form and fix issues"
```

---

## Task 12: Playwright UI Test

**Step 1: Login and navigate to create event**
**Step 2: Fill all sections and create event**
**Step 3: Verify event created, navigate to settings**
**Step 4: Verify all fields pre-populated**
**Step 5: Edit and save, verify persistence**
**Step 6: Document any remaining issues**

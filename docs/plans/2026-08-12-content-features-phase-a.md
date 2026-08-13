# Phase A: Content Consumption Features — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Use superpowers:test-driven-development for all implementation.

**Goal:** Implement Speaker Enhancement, Documents & Videos, Agenda Import/Export, and Session Q&A to achieve full Whova content parity.

**Architecture:** Extends existing feature module pattern (actions.ts, queries.ts, components/). New DB tables for Q&A and documents via migrations. Server actions for mutations, server queries for reads. Supabase Realtime for live Q&A updates. TDD with Vitest for all logic.

**Tech Stack:** Next.js 16, React 19, TypeScript, Supabase (PostgreSQL + Realtime), Tailwind 4, Vitest, papaparse (CSV), ical-generator (iCal)

---

## Task 1: Migration — Speaker Enhancement

**Files:**
- Create: `packages/supabase/migrations/037_speaker_enhancements.sql`

**Step 1: Write the migration**

```sql
-- =============================================================================
-- Speaker Manager Enhancement
-- Adds social links, featured flag, and sort order to speakers
-- =============================================================================

ALTER TABLE public.speakers
  ADD COLUMN linkedin_url TEXT,
  ADD COLUMN twitter_handle TEXT,
  ADD COLUMN website_url TEXT,
  ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN sort_order INT NOT NULL DEFAULT 0;

CREATE INDEX idx_speakers_featured ON public.speakers(event_id, is_featured) WHERE is_featured = true;
CREATE INDEX idx_speakers_sort ON public.speakers(event_id, sort_order);
```

**Step 2: Apply the migration**

```bash
cd /Users/bertwinromero/Documents/billionsoulharves-workspace/attendly
npx supabase migration up
```

**Step 3: Commit**

```bash
git add packages/supabase/migrations/037_speaker_enhancements.sql
git commit -m "feat: add social links, featured flag, sort order to speakers table"
```

---

## Task 2: Speaker Actions & Queries Enhancement

**Files:**
- Modify: `apps/web/src/features/speakers/actions.ts`
- Modify: `apps/web/src/features/speakers/queries.ts`
- Create: `apps/web/src/features/speakers/actions.test.ts`
- Create: `apps/web/src/features/speakers/queries.test.ts`

**Step 1: Write failing tests for actions**

```typescript
// apps/web/src/features/speakers/actions.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock modules before imports
vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createSpeaker, updateSpeaker, deleteSpeaker, bulkImportSpeakers } from "./actions";
import { createClient } from "@attendly/ui/supabase/server";

function mockSupabase(overrides: Record<string, any> = {}) {
  const chain: any = {
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: "s1", name: "Test" }, error: null }),
    ...overrides,
  };
  (createClient as any).mockResolvedValue(chain);
  return chain;
}

describe("createSpeaker", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates speaker with social links and featured flag", async () => {
    const mock = mockSupabase();
    await createSpeaker("e1", {
      name: "Jane Doe",
      linkedin_url: "https://linkedin.com/in/jane",
      twitter_handle: "@jane",
      website_url: "https://jane.dev",
      is_featured: true,
    });
    expect(mock.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_id: "e1",
        name: "Jane Doe",
        linkedin_url: "https://linkedin.com/in/jane",
        twitter_handle: "@jane",
        website_url: "https://jane.dev",
        is_featured: true,
      })
    );
  });

  it("creates speaker with default values when social links omitted", async () => {
    const mock = mockSupabase();
    await createSpeaker("e1", { name: "John" });
    expect(mock.insert).toHaveBeenCalledWith(
      expect.objectContaining({ event_id: "e1", name: "John" })
    );
  });
});

describe("bulkImportSpeakers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("inserts multiple speakers from CSV rows", async () => {
    const mock = mockSupabase({
      single: undefined,
      select: vi.fn().mockResolvedValue({
        data: [
          { id: "s1", name: "Alice" },
          { id: "s2", name: "Bob" },
        ],
        error: null,
      }),
    });
    const rows = [
      { name: "Alice", title: "CTO", company: "Acme" },
      { name: "Bob", title: "VP", company: "Corp" },
    ];
    const result = await bulkImportSpeakers("e1", rows);
    expect(mock.insert).toHaveBeenCalled();
    expect(result).toHaveLength(2);
  });

  it("throws on empty rows", async () => {
    mockSupabase();
    await expect(bulkImportSpeakers("e1", [])).rejects.toThrow("No speakers to import");
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
cd /Users/bertwinromero/Documents/billionsoulharves-workspace/attendly/apps/web
npx vitest run src/features/speakers/actions.test.ts
```

Expected: FAIL — `bulkImportSpeakers` not exported.

**Step 3: Update actions.ts with new fields and bulk import**

```typescript
// apps/web/src/features/speakers/actions.ts
"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function createSpeaker(eventId: string, data: {
  name: string;
  title?: string;
  company?: string;
  bio?: string;
  photo?: string;
  email?: string;
  linkedin_url?: string;
  twitter_handle?: string;
  website_url?: string;
  is_featured?: boolean;
  sort_order?: number;
}) {
  const supabase = await createClient();

  const { data: speaker, error } = await supabase
    .from("speakers")
    .insert({ event_id: eventId, ...data })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/schedule`);
  return speaker;
}

export async function updateSpeaker(eventId: string, speakerId: string, data: {
  name?: string;
  title?: string;
  company?: string;
  bio?: string;
  photo?: string;
  email?: string;
  linkedin_url?: string;
  twitter_handle?: string;
  website_url?: string;
  is_featured?: boolean;
  sort_order?: number;
}) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("speakers")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", speakerId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/schedule`);
}

export async function deleteSpeaker(eventId: string, speakerId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("speakers")
    .delete()
    .eq("id", speakerId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/schedule`);
}

export async function bulkImportSpeakers(eventId: string, rows: {
  name: string;
  title?: string;
  company?: string;
  bio?: string;
  email?: string;
  linkedin_url?: string;
  twitter_handle?: string;
  website_url?: string;
}[]) {
  if (rows.length === 0) throw new Error("No speakers to import");

  const supabase = await createClient();

  const insertData = rows.map((row) => ({
    event_id: eventId,
    name: row.name,
    title: row.title || null,
    company: row.company || null,
    bio: row.bio || null,
    email: row.email || null,
    linkedin_url: row.linkedin_url || null,
    twitter_handle: row.twitter_handle || null,
    website_url: row.website_url || null,
  }));

  const { data, error } = await supabase
    .from("speakers")
    .insert(insertData)
    .select();

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/schedule`);
  return data;
}
```

**Step 4: Write failing tests for queries**

```typescript
// apps/web/src/features/speakers/queries.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { getSpeakersByEvent, getSpeakerById } from "./queries";
import { createClient } from "@attendly/ui/supabase/server";

function mockSupabase(resolvedData: any, error: any = null) {
  const chain: any = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: resolvedData, error }),
    single: vi.fn().mockResolvedValue({ data: resolvedData, error }),
  };
  (createClient as any).mockResolvedValue(chain);
  return chain;
}

describe("getSpeakersByEvent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns speakers ordered by sort_order then name", async () => {
    const speakers = [
      { id: "s1", name: "Alice", sort_order: 0 },
      { id: "s2", name: "Bob", sort_order: 1 },
    ];
    mockSupabase(speakers);
    const result = await getSpeakersByEvent("e1");
    expect(result).toEqual(speakers);
  });
});

describe("getSpeakerById", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns speaker with linked sessions", async () => {
    const speaker = {
      id: "s1",
      name: "Alice",
      session_speakers: [{ sessions: { id: "sess1", title: "Talk" } }],
    };
    mockSupabase(speaker);
    const result = await getSpeakerById("s1");
    expect(result).toEqual(speaker);
  });

  it("throws on not found", async () => {
    mockSupabase(null, { message: "Not found" });
    await expect(getSpeakerById("bad")).rejects.toThrow("Not found");
  });
});
```

**Step 5: Update queries.ts**

```typescript
// apps/web/src/features/speakers/queries.ts
import { createClient } from "@attendly/ui/supabase/server";

export async function getSpeakersByEvent(eventId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("speakers")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order")
    .order("name");

  if (error) throw new Error(error.message);
  return data;
}

export async function getSpeakerById(speakerId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("speakers")
    .select(`
      *,
      session_speakers(
        sessions(id, title, start_time, end_time, location, type, tracks(name, color))
      )
    `)
    .eq("id", speakerId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}
```

**Step 6: Run tests**

```bash
npx vitest run src/features/speakers/actions.test.ts src/features/speakers/queries.test.ts
```

**Step 7: Commit**

```bash
git add apps/web/src/features/speakers/
git commit -m "feat: enhance speaker actions/queries with social links, featured flag, bulk import"
```

---

## Task 3: Speaker Form & List UI Enhancement

**Files:**
- Modify: `apps/web/src/features/speakers/components/speaker-form.tsx`
- Modify: `apps/web/src/features/speakers/components/speaker-list.tsx`
- Create: `apps/web/src/features/speakers/components/speaker-csv-import.tsx`

**Step 1: Update SpeakerForm to include new fields**

Add to the `SpeakerData` type:
- `linkedin_url`, `twitter_handle`, `website_url`, `is_featured`

Add form fields after the Bio textarea:
- Social links row: LinkedIn URL, Twitter Handle, Website URL inputs
- Featured toggle: Switch/checkbox for `is_featured`

**Step 2: Update SpeakerList to show featured badge and social icons**

- Show a star icon on featured speakers
- Show small social link icons (LinkedIn, Twitter/X, Globe) on hover
- Sort by `sort_order` (already handled server-side)

**Step 3: Create SpeakerCsvImport component**

```typescript
// apps/web/src/features/speakers/components/speaker-csv-import.tsx
"use client";

import { useState, useCallback } from "react";
import { Upload, FileText, X } from "lucide-react";
import { Button, ModalOverlay } from "@attendly/ui/components";
import { toast } from "sonner";
import { bulkImportSpeakers } from "../actions";

const EXPECTED_COLUMNS = ["name", "title", "company", "bio", "email", "linkedin_url", "twitter_handle", "website_url"];

export function SpeakerCsvImport({
  eventId,
  onComplete,
  onCancel,
}: {
  eventId: string;
  onComplete: () => void;
  onCancel: () => void;
}) {
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter((l) => l.trim());
      if (lines.length < 2) {
        toast.error("CSV must have a header row and at least one data row");
        return;
      }
      const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
      const nameIdx = headers.indexOf("name");
      if (nameIdx === -1) {
        toast.error("CSV must have a 'name' column");
        return;
      }
      const parsed = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
        const row: Record<string, string> = {};
        headers.forEach((h, i) => {
          if (EXPECTED_COLUMNS.includes(h) && values[i]) row[h] = values[i];
        });
        return row;
      }).filter((r) => r.name);
      setRows(parsed);
    };
    reader.readAsText(file);
  }, []);

  async function handleImport() {
    setLoading(true);
    try {
      await bulkImportSpeakers(eventId, rows as any);
      toast.success(`Imported ${rows.length} speakers`);
      onComplete();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalOverlay onClose={onCancel}>
      <div className="w-full max-w-2xl rounded-xl border bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Import Speakers from CSV</h2>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {rows.length === 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload a CSV with columns: name (required), title, company, bio, email, linkedin_url, twitter_handle, website_url
            </p>
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 hover:border-primary/50">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium">Choose CSV file</span>
              <input type="file" accept=".csv" onChange={handleFile} className="hidden" />
            </label>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              {fileName} — {rows.length} speakers found
            </div>
            <div className="max-h-64 overflow-auto rounded border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Title</th>
                    <th className="px-3 py-2 text-left">Company</th>
                    <th className="px-3 py-2 text-left">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-1.5">{row.name}</td>
                      <td className="px-3 py-1.5">{row.title || "—"}</td>
                      <td className="px-3 py-1.5">{row.company || "—"}</td>
                      <td className="px-3 py-1.5">{row.email || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRows([])}>Back</Button>
              <Button onClick={handleImport} loading={loading}>
                Import {rows.length} Speakers
              </Button>
            </div>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}
```

**Step 4: Commit**

```bash
git add apps/web/src/features/speakers/components/
git commit -m "feat: add social links, featured flag to speaker form; add CSV import"
```

---

## Task 4: Public Speaker Detail Page

**Files:**
- Create: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/speakers/[speakerId]/page.tsx`

**Step 1: Create the detail page**

```typescript
// apps/web/src/app/(public)/[orgSlug]/[eventSlug]/speakers/[speakerId]/page.tsx
import { createClient } from "@attendly/ui/supabase/server";
import { notFound } from "next/navigation";
import { Avatar } from "@attendly/ui/components";
import { Linkedin, Twitter, Globe, Calendar, MapPin, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function SpeakerDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string; speakerId: string }>;
}) {
  const { orgSlug, eventSlug, speakerId } = await params;
  const supabase = await createClient();

  const { data: speaker } = await supabase
    .from("speakers")
    .select(`
      *,
      session_speakers(
        sessions(id, title, start_time, end_time, location, type, tracks(name, color))
      )
    `)
    .eq("id", speakerId)
    .single();

  if (!speaker) notFound();

  const sessions = (speaker.session_speakers ?? [])
    .map((ss: any) => ss.sessions)
    .filter(Boolean)
    .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href={`/${orgSlug}/${eventSlug}/speakers`}
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Speakers
      </Link>

      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <Avatar src={speaker.photo} name={speaker.name} size="xl" />
        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-bold">{speaker.name}</h1>
          {(speaker.title || speaker.company) && (
            <p className="mt-1 text-muted-foreground">
              {[speaker.title, speaker.company].filter(Boolean).join(" at ")}
            </p>
          )}
          <div className="mt-3 flex gap-3 justify-center sm:justify-start">
            {speaker.linkedin_url && (
              <a href={speaker.linkedin_url} target="_blank" rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground">
                <Linkedin className="h-5 w-5" />
              </a>
            )}
            {speaker.twitter_handle && (
              <a href={`https://twitter.com/${speaker.twitter_handle.replace("@", "")}`}
                target="_blank" rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground">
                <Twitter className="h-5 w-5" />
              </a>
            )}
            {speaker.website_url && (
              <a href={speaker.website_url} target="_blank" rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground">
                <Globe className="h-5 w-5" />
              </a>
            )}
          </div>
        </div>
      </div>

      {speaker.bio && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold">About</h2>
          <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{speaker.bio}</p>
        </div>
      )}

      {sessions.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold">Sessions</h2>
          <div className="mt-3 space-y-3">
            {sessions.map((session: any) => (
              <div key={session.id} className="rounded-lg border p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">{session.title}</p>
                    {session.tracks && (
                      <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-xs"
                        style={{ backgroundColor: session.tracks.color + "20", color: session.tracks.color }}>
                        {session.tracks.name}
                      </span>
                    )}
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{session.type}</span>
                </div>
                <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(session.start_time).toLocaleString("en-US", {
                      month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                    })}
                  </span>
                  {session.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {session.location}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Update public speakers listing to link to detail pages**

In `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/speakers/page.tsx`, wrap each speaker card with `<Link href={/${orgSlug}/${eventSlug}/speakers/${speaker.id}}>`.

**Step 3: Commit**

```bash
git add apps/web/src/app/\(public\)/\[orgSlug\]/\[eventSlug\]/speakers/
git commit -m "feat: add public speaker detail page with sessions and social links"
```

---

## Task 5: Migration — Documents & Videos

**Files:**
- Create: `packages/supabase/migrations/038_documents_videos.sql`

**Step 1: Write the migration**

```sql
-- =============================================================================
-- Documents & Videos
-- Event-level and session-level document/video attachments with download tracking
-- =============================================================================

CREATE TABLE public.event_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('file', 'video')),
  file_url TEXT,
  external_url TEXT,
  file_size BIGINT,
  file_type TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.document_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.event_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_event_documents_event ON public.event_documents(event_id);
CREATE INDEX idx_event_documents_session ON public.event_documents(session_id);
CREATE INDEX idx_document_downloads_doc ON public.document_downloads(document_id);

-- RLS
ALTER TABLE public.event_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_downloads ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT ON public.event_documents TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_documents TO authenticated;
GRANT ALL ON public.event_documents TO service_role;

GRANT SELECT, INSERT ON public.document_downloads TO authenticated;
GRANT ALL ON public.document_downloads TO service_role;

-- Policies: event_documents
CREATE POLICY "Anyone can view documents for published events"
  ON public.event_documents FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM events e WHERE e.id = event_documents.event_id AND e.status = 'published'
  ));

CREATE POLICY "Authenticated can view documents"
  ON public.event_documents FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e WHERE e.id = event_documents.event_id
    AND (e.status = 'published' OR is_org_member(e.organization_id))
  ));

CREATE POLICY "Org members can manage documents"
  ON public.event_documents FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e WHERE e.id = event_documents.event_id AND is_org_member(e.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM events e WHERE e.id = event_documents.event_id AND is_org_member(e.organization_id)
  ));

-- Policies: document_downloads
CREATE POLICY "Users can track own downloads"
  ON public.document_downloads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Org members can view download stats"
  ON public.document_downloads FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM event_documents d
    JOIN events e ON e.id = d.event_id
    WHERE d.id = document_downloads.document_id
    AND is_org_member(e.organization_id)
  ));
```

**Step 2: Apply and commit**

```bash
npx supabase migration up
git add packages/supabase/migrations/038_documents_videos.sql
git commit -m "feat: add event_documents and document_downloads tables"
```

---

## Task 6: Documents Actions, Queries & Tests

**Files:**
- Create: `apps/web/src/features/documents/actions.ts`
- Create: `apps/web/src/features/documents/queries.ts`
- Create: `apps/web/src/features/documents/actions.test.ts`
- Create: `apps/web/src/features/documents/queries.test.ts`

**Step 1: Write failing tests for queries**

```typescript
// apps/web/src/features/documents/queries.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { getEventDocuments, getSessionDocuments, getDocumentDownloadStats } from "./queries";
import { createClient } from "@attendly/ui/supabase/server";

function mockSupabase(resolvedData: any, error: any = null) {
  const chain: any = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: resolvedData, error }),
  };
  (createClient as any).mockResolvedValue(chain);
  return chain;
}

describe("getEventDocuments", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns event-level documents (session_id is null)", async () => {
    const docs = [{ id: "d1", title: "Slides", type: "file" }];
    mockSupabase(docs);
    const result = await getEventDocuments("e1");
    expect(result).toEqual(docs);
  });
});

describe("getSessionDocuments", () => {
  it("returns documents for a specific session", async () => {
    const docs = [{ id: "d2", title: "Video", type: "video" }];
    mockSupabase(docs);
    const result = await getSessionDocuments("s1");
    expect(result).toEqual(docs);
  });
});
```

**Step 2: Implement queries**

```typescript
// apps/web/src/features/documents/queries.ts
import { createClient } from "@attendly/ui/supabase/server";

export async function getEventDocuments(eventId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_documents")
    .select("*")
    .eq("event_id", eventId)
    .is("session_id", null)
    .order("sort_order");

  if (error) throw new Error(error.message);
  return data;
}

export async function getSessionDocuments(sessionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_documents")
    .select("*")
    .eq("session_id", sessionId)
    .order("sort_order");

  if (error) throw new Error(error.message);
  return data;
}

export async function getAllDocumentsByEvent(eventId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_documents")
    .select("*, sessions(title)")
    .eq("event_id", eventId)
    .order("sort_order");

  if (error) throw new Error(error.message);
  return data;
}

export async function getDocumentDownloadStats(eventId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_documents")
    .select("id, title, document_downloads(count)")
    .eq("event_id", eventId)
    .order("sort_order");

  if (error) throw new Error(error.message);
  return data;
}
```

**Step 3: Write failing tests for actions**

```typescript
// apps/web/src/features/documents/actions.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createDocument, updateDocument, deleteDocument, trackDownload } from "./actions";
import { createClient } from "@attendly/ui/supabase/server";

function mockSupabase(overrides: Record<string, any> = {}) {
  const chain: any = {
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: "d1" }, error: null }),
    ...overrides,
  };
  (createClient as any).mockResolvedValue(chain);
  return chain;
}

describe("createDocument", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a file document", async () => {
    const mock = mockSupabase();
    await createDocument("e1", {
      title: "Keynote Slides",
      type: "file",
      file_url: "/files/slides.pdf",
      file_type: "pdf",
      file_size: 1024,
    });
    expect(mock.insert).toHaveBeenCalledWith(
      expect.objectContaining({ event_id: "e1", title: "Keynote Slides", type: "file" })
    );
  });

  it("creates a video document with external URL", async () => {
    const mock = mockSupabase();
    await createDocument("e1", {
      title: "Intro Video",
      type: "video",
      external_url: "https://youtube.com/watch?v=abc",
    });
    expect(mock.insert).toHaveBeenCalledWith(
      expect.objectContaining({ type: "video", external_url: "https://youtube.com/watch?v=abc" })
    );
  });
});

describe("trackDownload", () => {
  it("inserts a download record", async () => {
    const mock = mockSupabase({
      single: undefined,
    });
    mock.insert.mockResolvedValue({ error: null });
    await trackDownload("d1", "u1");
    expect(mock.insert).toHaveBeenCalledWith(
      expect.objectContaining({ document_id: "d1", user_id: "u1" })
    );
  });
});
```

**Step 4: Implement actions**

```typescript
// apps/web/src/features/documents/actions.ts
"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function createDocument(eventId: string, data: {
  title: string;
  type: "file" | "video";
  session_id?: string;
  file_url?: string;
  external_url?: string;
  file_size?: number;
  file_type?: string;
  sort_order?: number;
}) {
  const supabase = await createClient();

  const { data: doc, error } = await supabase
    .from("event_documents")
    .insert({
      event_id: eventId,
      session_id: data.session_id || null,
      title: data.title,
      type: data.type,
      file_url: data.file_url || null,
      external_url: data.external_url || null,
      file_size: data.file_size || null,
      file_type: data.file_type || null,
      sort_order: data.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/documents`);
  return doc;
}

export async function updateDocument(eventId: string, docId: string, data: {
  title?: string;
  type?: "file" | "video";
  file_url?: string;
  external_url?: string;
  file_size?: number;
  file_type?: string;
  sort_order?: number;
}) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("event_documents")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", docId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/documents`);
}

export async function deleteDocument(eventId: string, docId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("event_documents")
    .delete()
    .eq("id", docId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}/documents`);
}

export async function trackDownload(docId: string, userId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("document_downloads")
    .insert({ document_id: docId, user_id: userId });

  if (error) throw new Error(error.message);
}
```

**Step 5: Run tests and commit**

```bash
npx vitest run src/features/documents/
git add apps/web/src/features/documents/
git commit -m "feat: add document CRUD actions, queries, and tests"
```

---

## Task 7: Documents Organizer UI

**Files:**
- Create: `apps/web/src/features/documents/components/document-list.tsx`
- Create: `apps/web/src/features/documents/components/document-form.tsx`
- Create: `apps/web/src/app/(organizer)/events/[eventId]/documents/page.tsx`

**Step 1: Create DocumentForm component**

Modal form with:
- Title (required text input)
- Type toggle: File / Video
- If File: file upload component (reuse ImageUpload pattern but allow PDF/PPTX/DOCX)
- If Video: external URL input (YouTube/Vimeo)
- Optional: attach to session (dropdown of event sessions) or event-level
- Sort order number input

**Step 2: Create DocumentList component**

- Table/card view showing all documents
- Group by: Event-level vs Session-attached
- Show file type icon (PDF, PPTX, video), title, type badge, download count
- Hover actions: edit, delete
- Add button opens DocumentForm

**Step 3: Create organizer page**

```typescript
// apps/web/src/app/(organizer)/events/[eventId]/documents/page.tsx
import { getAllDocumentsByEvent } from "@/features/documents/queries";
import { getSessionsByEvent } from "@/features/schedule/queries";
import { DocumentList } from "@/features/documents/components/document-list";

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const [documents, sessions] = await Promise.all([
    getAllDocumentsByEvent(eventId),
    getSessionsByEvent(eventId),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Documents & Videos</h1>
      <DocumentList eventId={eventId} initialDocuments={documents} sessions={sessions} />
    </div>
  );
}
```

**Step 4: Add to event sub-sidebar**

In the layout file that builds sidebar groups, add a "Documents" item under Content section:
```typescript
{ href: `/events/${eventId}/documents`, label: "Documents", icon: "file-text" }
```

**Step 5: Commit**

```bash
git add apps/web/src/features/documents/components/ apps/web/src/app/\(organizer\)/events/\[eventId\]/documents/
git commit -m "feat: add organizer documents page with CRUD UI"
```

---

## Task 8: Public Resources Page

**Files:**
- Create: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/resources/page.tsx`
- Create: `apps/web/src/features/documents/components/video-embed.tsx`

**Step 1: Create VideoEmbed component**

```typescript
// apps/web/src/features/documents/components/video-embed.tsx
"use client";

export function VideoEmbed({ url }: { url: string }) {
  const embedUrl = getEmbedUrl(url);
  if (!embedUrl) return <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>;

  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg">
      <iframe
        src={embedUrl}
        className="h-full w-full"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    </div>
  );
}

function getEmbedUrl(url: string): string | null {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

  return null;
}
```

**Step 2: Create public Resources page**

Groups documents by type (Files / Videos), shows download buttons for files, embeds for videos.

**Step 3: Add "Add to Calendar" link generation utility**

```typescript
// apps/web/src/features/schedule/ical.ts
export function generateSessionIcsUrl(session: {
  title: string;
  description?: string;
  location?: string;
  start_time: string;
  end_time: string;
}): string {
  const start = formatIcsDate(session.start_time);
  const end = formatIcsDate(session.end_time);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Attendly//EN",
    "BEGIN:VEVENT",
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcs(session.title)}`,
    session.description ? `DESCRIPTION:${escapeIcs(session.description)}` : "",
    session.location ? `LOCATION:${escapeIcs(session.location)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");

  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

function formatIcsDate(dateStr: string): string {
  return new Date(dateStr).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeIcs(text: string): string {
  return text.replace(/[,;\\]/g, (m) => `\\${m}`).replace(/\n/g, "\\n");
}
```

**Step 4: Create test for iCal utility**

```typescript
// apps/web/src/features/schedule/ical.test.ts
import { describe, it, expect } from "vitest";
import { generateSessionIcsUrl } from "./ical";

describe("generateSessionIcsUrl", () => {
  it("generates valid data URL with VCALENDAR", () => {
    const url = generateSessionIcsUrl({
      title: "Keynote",
      start_time: "2026-09-15T09:00:00Z",
      end_time: "2026-09-15T10:00:00Z",
    });
    expect(url).toContain("data:text/calendar");
    expect(url).toContain("VCALENDAR");
    expect(url).toContain("Keynote");
  });

  it("includes location when provided", () => {
    const url = generateSessionIcsUrl({
      title: "Talk",
      location: "Room A",
      start_time: "2026-09-15T09:00:00Z",
      end_time: "2026-09-15T10:00:00Z",
    });
    expect(url).toContain("LOCATION");
    expect(url).toContain("Room%20A");
  });

  it("escapes special characters", () => {
    const url = generateSessionIcsUrl({
      title: "Talk, Part 1; Intro",
      start_time: "2026-09-15T09:00:00Z",
      end_time: "2026-09-15T10:00:00Z",
    });
    expect(decodeURIComponent(url)).toContain("Talk\\, Part 1\\; Intro");
  });
});
```

**Step 5: Commit**

```bash
git add apps/web/src/features/documents/components/video-embed.tsx \
  apps/web/src/app/\(public\)/\[orgSlug\]/\[eventSlug\]/resources/ \
  apps/web/src/features/schedule/ical.ts \
  apps/web/src/features/schedule/ical.test.ts
git commit -m "feat: add public resources page, video embed, iCal generation"
```

---

## Task 9: Agenda CSV Export & Import

**Files:**
- Create: `apps/web/src/features/schedule/csv-export.ts`
- Create: `apps/web/src/features/schedule/csv-import.ts`
- Create: `apps/web/src/features/schedule/csv-export.test.ts`
- Create: `apps/web/src/features/schedule/csv-import.test.ts`
- Create: `apps/web/src/features/schedule/components/agenda-import-export.tsx`

**Step 1: Write failing tests for CSV export**

```typescript
// apps/web/src/features/schedule/csv-export.test.ts
import { describe, it, expect } from "vitest";
import { sessionsToCSV } from "./csv-export";

describe("sessionsToCSV", () => {
  it("converts sessions array to CSV string with headers", () => {
    const sessions = [
      {
        title: "Keynote",
        description: "Opening",
        type: "keynote",
        start_time: "2026-09-15T09:00:00Z",
        end_time: "2026-09-15T10:00:00Z",
        location: "Main Hall",
        track: { name: "General" },
        session_speakers: [{ speakers: { name: "Alice" } }],
      },
    ];
    const csv = sessionsToCSV(sessions as any);
    expect(csv).toContain("title,description,type,track,start_time,end_time,location,speakers");
    expect(csv).toContain("Keynote");
    expect(csv).toContain("Alice");
  });

  it("handles sessions with no speakers", () => {
    const sessions = [
      { title: "Break", type: "break", start_time: "2026-09-15T10:00:00Z", end_time: "2026-09-15T10:30:00Z", session_speakers: [] },
    ];
    const csv = sessionsToCSV(sessions as any);
    expect(csv).toContain("Break");
  });

  it("escapes commas in fields", () => {
    const sessions = [
      { title: "Talk, Part 1", type: "talk", start_time: "2026-09-15T09:00:00Z", end_time: "2026-09-15T10:00:00Z", session_speakers: [] },
    ];
    const csv = sessionsToCSV(sessions as any);
    expect(csv).toContain('"Talk, Part 1"');
  });
});
```

**Step 2: Implement CSV export**

```typescript
// apps/web/src/features/schedule/csv-export.ts
type SessionForExport = {
  title: string;
  description?: string | null;
  type: string;
  start_time: string;
  end_time: string;
  location?: string | null;
  track?: { name: string } | null;
  session_speakers: { speakers: { name: string } }[];
};

export function sessionsToCSV(sessions: SessionForExport[]): string {
  const headers = ["title", "description", "type", "track", "start_time", "end_time", "location", "speakers"];
  const rows = sessions.map((s) => [
    csvEscape(s.title),
    csvEscape(s.description ?? ""),
    csvEscape(s.type),
    csvEscape(s.track?.name ?? ""),
    s.start_time,
    s.end_time,
    csvEscape(s.location ?? ""),
    csvEscape(s.session_speakers.map((ss) => ss.speakers.name).join("; ")),
  ]);
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
```

**Step 3: Write failing tests for CSV import parser**

```typescript
// apps/web/src/features/schedule/csv-import.test.ts
import { describe, it, expect } from "vitest";
import { parseSessionsCSV } from "./csv-import";

describe("parseSessionsCSV", () => {
  it("parses CSV text into session objects", () => {
    const csv = `title,type,start_time,end_time,track,speakers
Keynote,keynote,2026-09-15T09:00:00Z,2026-09-15T10:00:00Z,General,Alice; Bob`;
    const result = parseSessionsCSV(csv);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Keynote");
    expect(result[0].type).toBe("keynote");
    expect(result[0].speakerNames).toEqual(["Alice", "Bob"]);
    expect(result[0].trackName).toBe("General");
  });

  it("handles missing optional columns", () => {
    const csv = `title,start_time,end_time
Break,2026-09-15T10:00:00Z,2026-09-15T10:30:00Z`;
    const result = parseSessionsCSV(csv);
    expect(result[0].type).toBe("talk");
    expect(result[0].speakerNames).toEqual([]);
  });

  it("skips rows without title", () => {
    const csv = `title,start_time,end_time
,2026-09-15T10:00:00Z,2026-09-15T10:30:00Z
Real Talk,2026-09-15T11:00:00Z,2026-09-15T12:00:00Z`;
    const result = parseSessionsCSV(csv);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Real Talk");
  });

  it("detects duplicates by title + start_time", () => {
    const csv = `title,start_time,end_time
Talk,2026-09-15T09:00:00Z,2026-09-15T10:00:00Z
Talk,2026-09-15T09:00:00Z,2026-09-15T10:00:00Z`;
    const result = parseSessionsCSV(csv);
    expect(result).toHaveLength(1);
  });
});
```

**Step 4: Implement CSV import parser**

```typescript
// apps/web/src/features/schedule/csv-import.ts
export type ParsedSession = {
  title: string;
  description: string;
  type: string;
  start_time: string;
  end_time: string;
  location: string;
  trackName: string;
  speakerNames: string[];
};

const VALID_TYPES = ["talk", "workshop", "panel", "keynote", "break"];

export function parseSessionsCSV(csvText: string): ParsedSession[] {
  const lines = csvText.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  const col = (name: string) => headers.indexOf(name);

  const seen = new Set<string>();
  const results: ParsedSession[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const title = values[col("title")]?.trim();
    if (!title) continue;

    const start_time = values[col("start_time")]?.trim() ?? "";
    const dedupKey = `${title}::${start_time}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    const rawType = values[col("type")]?.trim().toLowerCase() ?? "talk";
    const speakersRaw = values[col("speakers")]?.trim() ?? "";

    results.push({
      title,
      description: values[col("description")]?.trim() ?? "",
      type: VALID_TYPES.includes(rawType) ? rawType : "talk",
      start_time,
      end_time: values[col("end_time")]?.trim() ?? "",
      location: values[col("location")]?.trim() ?? "",
      trackName: values[col("track")]?.trim() ?? "",
      speakerNames: speakersRaw ? speakersRaw.split(";").map((s) => s.trim()).filter(Boolean) : [],
    });
  }

  return results;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
```

**Step 5: Create server action for bulk import**

```typescript
// Add to apps/web/src/features/schedule/actions.ts

export async function bulkImportSessions(eventId: string, sessions: {
  title: string;
  description?: string;
  type?: string;
  start_time: string;
  end_time: string;
  location?: string;
  trackName?: string;
  speakerNames?: string[];
}[]) {
  if (sessions.length === 0) throw new Error("No sessions to import");

  const supabase = await createClient();

  // Get or create tracks
  const trackNames = [...new Set(sessions.map((s) => s.trackName).filter(Boolean))] as string[];
  const trackMap = new Map<string, string>();

  if (trackNames.length > 0) {
    const { data: existingTracks } = await supabase
      .from("tracks")
      .select("id, name")
      .eq("event_id", eventId)
      .in("name", trackNames);

    for (const t of existingTracks ?? []) trackMap.set(t.name, t.id);

    const newTrackNames = trackNames.filter((n) => !trackMap.has(n));
    if (newTrackNames.length > 0) {
      const { data: newTracks } = await supabase
        .from("tracks")
        .insert(newTrackNames.map((name) => ({ event_id: eventId, name })))
        .select("id, name");
      for (const t of newTracks ?? []) trackMap.set(t.name, t.id);
    }
  }

  // Get or create speakers
  const allSpeakerNames = [...new Set(sessions.flatMap((s) => s.speakerNames ?? []))];
  const speakerMap = new Map<string, string>();

  if (allSpeakerNames.length > 0) {
    const { data: existingSpeakers } = await supabase
      .from("speakers")
      .select("id, name")
      .eq("event_id", eventId)
      .in("name", allSpeakerNames);

    for (const s of existingSpeakers ?? []) speakerMap.set(s.name, s.id);

    const newSpeakerNames = allSpeakerNames.filter((n) => !speakerMap.has(n));
    if (newSpeakerNames.length > 0) {
      const { data: newSpeakers } = await supabase
        .from("speakers")
        .insert(newSpeakerNames.map((name) => ({ event_id: eventId, name })))
        .select("id, name");
      for (const s of newSpeakers ?? []) speakerMap.set(s.name, s.id);
    }
  }

  // Insert sessions
  const sessionInserts = sessions.map((s) => ({
    event_id: eventId,
    title: s.title,
    description: s.description || null,
    type: s.type || "talk",
    start_time: s.start_time,
    end_time: s.end_time,
    location: s.location || null,
    track_id: s.trackName ? trackMap.get(s.trackName) ?? null : null,
  }));

  const { data: insertedSessions, error } = await supabase
    .from("sessions")
    .insert(sessionInserts)
    .select("id, title");

  if (error) throw new Error(error.message);

  // Link speakers
  const speakerLinks: { session_id: string; speaker_id: string }[] = [];
  for (let i = 0; i < sessions.length; i++) {
    const sessionId = insertedSessions?.[i]?.id;
    if (!sessionId) continue;
    for (const name of sessions[i].speakerNames ?? []) {
      const speakerId = speakerMap.get(name);
      if (speakerId) speakerLinks.push({ session_id: sessionId, speaker_id: speakerId });
    }
  }

  if (speakerLinks.length > 0) {
    await supabase.from("session_speakers").insert(speakerLinks);
  }

  revalidatePath(`/events/${eventId}/schedule`);
  return insertedSessions;
}
```

**Step 6: Create AgendaImportExport component**

UI buttons on organizer schedule page: "Export CSV", "Export iCal", "Import CSV" (opens modal with file picker + preview).

**Step 7: Run tests and commit**

```bash
npx vitest run src/features/schedule/csv-export.test.ts src/features/schedule/csv-import.test.ts
git add apps/web/src/features/schedule/
git commit -m "feat: add agenda CSV import/export and iCal generation"
```

---

## Task 10: Migration — Session Q&A

**Files:**
- Create: `packages/supabase/migrations/039_session_qa.sql`

**Step 1: Write the migration**

```sql
-- =============================================================================
-- Session Q&A — questions, upvotes, and session-level toggles
-- =============================================================================

-- Session-level toggles
ALTER TABLE public.sessions
  ADD COLUMN qa_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN qa_moderation_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN qa_anonymous_enabled BOOLEAN NOT NULL DEFAULT true;

-- Questions table
CREATE TABLE public.session_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'answered')),
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  upvote_count INT NOT NULL DEFAULT 0,
  answer_text TEXT,
  answered_by UUID REFERENCES auth.users(id),
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Upvotes table
CREATE TABLE public.question_upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.session_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(question_id, user_id)
);

-- Indexes
CREATE INDEX idx_session_questions_session ON public.session_questions(session_id);
CREATE INDEX idx_session_questions_event ON public.session_questions(event_id);
CREATE INDEX idx_session_questions_status ON public.session_questions(session_id, status);
CREATE INDEX idx_question_upvotes_question ON public.question_upvotes(question_id);

-- RLS
ALTER TABLE public.session_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_upvotes ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT ON public.session_questions TO anon;
GRANT SELECT, INSERT, UPDATE ON public.session_questions TO authenticated;
GRANT ALL ON public.session_questions TO service_role;

GRANT SELECT, INSERT, DELETE ON public.question_upvotes TO authenticated;
GRANT ALL ON public.question_upvotes TO service_role;

-- Policies: session_questions

-- Anyone can see approved/answered questions for published events
CREATE POLICY "Anyone can view approved questions"
  ON public.session_questions FOR SELECT TO anon
  USING (
    status IN ('approved', 'answered') AND
    EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND e.status = 'published')
  );

-- Authenticated users can see approved + their own pending questions
CREATE POLICY "Authenticated can view questions"
  ON public.session_questions FOR SELECT TO authenticated
  USING (
    status IN ('approved', 'answered')
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM events e WHERE e.id = event_id AND is_org_member(e.organization_id)
    )
  );

-- Authenticated users can submit questions
CREATE POLICY "Authenticated can submit questions"
  ON public.session_questions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Org members can moderate (update status, answer, pin)
CREATE POLICY "Org members can moderate questions"
  ON public.session_questions FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e WHERE e.id = event_id AND is_org_member(e.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM events e WHERE e.id = event_id AND is_org_member(e.organization_id)
  ));

-- Policies: question_upvotes
CREATE POLICY "Users can manage own upvotes"
  ON public.question_upvotes FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anyone can count upvotes"
  ON public.question_upvotes FOR SELECT TO authenticated
  USING (true);

-- Function to increment/decrement upvote_count via trigger
CREATE OR REPLACE FUNCTION update_question_upvote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE session_questions SET upvote_count = upvote_count + 1 WHERE id = NEW.question_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE session_questions SET upvote_count = upvote_count - 1 WHERE id = OLD.question_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_question_upvote_count
  AFTER INSERT OR DELETE ON public.question_upvotes
  FOR EACH ROW EXECUTE FUNCTION update_question_upvote_count();

-- Enable Realtime for session_questions
ALTER PUBLICATION supabase_realtime ADD TABLE public.session_questions;
```

**Step 2: Apply and commit**

```bash
npx supabase migration up
git add packages/supabase/migrations/039_session_qa.sql
git commit -m "feat: add session Q&A tables with RLS, upvote trigger, and realtime"
```

---

## Task 11: Q&A Actions, Queries & Tests

**Files:**
- Create: `apps/web/src/features/qa/actions.ts`
- Create: `apps/web/src/features/qa/queries.ts`
- Create: `apps/web/src/features/qa/actions.test.ts`
- Create: `apps/web/src/features/qa/queries.test.ts`

**Step 1: Write failing tests for actions**

```typescript
// apps/web/src/features/qa/actions.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@attendly/ui/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { submitQuestion, answerQuestion, moderateQuestion, toggleUpvote } from "./actions";
import { createClient } from "@attendly/ui/supabase/server";

function mockSupabase(overrides: Record<string, any> = {}) {
  const chain: any = {
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: { id: "q1" }, error: null }),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
    ...overrides,
  };
  (createClient as any).mockResolvedValue(chain);
  return chain;
}

describe("submitQuestion", () => {
  beforeEach(() => vi.clearAllMocks());

  it("submits a question with auto-approved status when moderation disabled", async () => {
    const mock = mockSupabase();
    await submitQuestion({
      session_id: "s1",
      event_id: "e1",
      question_text: "What about scaling?",
      is_anonymous: false,
      moderation_enabled: false,
    });
    expect(mock.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        question_text: "What about scaling?",
        status: "approved",
        user_id: "u1",
      })
    );
  });

  it("submits as pending when moderation is enabled", async () => {
    const mock = mockSupabase();
    await submitQuestion({
      session_id: "s1",
      event_id: "e1",
      question_text: "Question?",
      is_anonymous: false,
      moderation_enabled: true,
    });
    expect(mock.insert).toHaveBeenCalledWith(
      expect.objectContaining({ status: "pending" })
    );
  });
});

describe("answerQuestion", () => {
  it("updates question with answer text and marks as answered", async () => {
    const mock = mockSupabase();
    await answerQuestion("q1", "e1", "Great question — yes we scale.");
    expect(mock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        answer_text: "Great question — yes we scale.",
        status: "answered",
      })
    );
  });
});

describe("moderateQuestion", () => {
  it("approves a question", async () => {
    const mock = mockSupabase();
    await moderateQuestion("q1", "e1", "approved");
    expect(mock.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "approved" })
    );
  });

  it("rejects invalid status", async () => {
    mockSupabase();
    await expect(moderateQuestion("q1", "e1", "invalid" as any)).rejects.toThrow();
  });
});
```

**Step 2: Implement actions**

```typescript
// apps/web/src/features/qa/actions.ts
"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function submitQuestion(data: {
  session_id: string;
  event_id: string;
  question_text: string;
  is_anonymous: boolean;
  moderation_enabled: boolean;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { error } = await supabase
    .from("session_questions")
    .insert({
      session_id: data.session_id,
      event_id: data.event_id,
      user_id: user.id,
      question_text: data.question_text,
      is_anonymous: data.is_anonymous,
      status: data.moderation_enabled ? "pending" : "approved",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${data.event_id}/qa`);
}

export async function answerQuestion(questionId: string, eventId: string, answerText: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { error } = await supabase
    .from("session_questions")
    .update({
      answer_text: answerText,
      answered_by: user.id,
      answered_at: new Date().toISOString(),
      status: "answered",
      updated_at: new Date().toISOString(),
    })
    .eq("id", questionId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/qa`);
}

export async function moderateQuestion(
  questionId: string,
  eventId: string,
  status: "approved" | "rejected"
) {
  if (!["approved", "rejected"].includes(status)) {
    throw new Error(`Invalid moderation status: ${status}`);
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("session_questions")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", questionId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/qa`);
}

export async function bulkModerateQuestions(
  questionIds: string[],
  eventId: string,
  status: "approved" | "rejected"
) {
  if (!["approved", "rejected"].includes(status)) {
    throw new Error(`Invalid moderation status: ${status}`);
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("session_questions")
    .update({ status, updated_at: new Date().toISOString() })
    .in("id", questionIds);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/qa`);
}

export async function togglePinQuestion(questionId: string, eventId: string, pinned: boolean) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("session_questions")
    .update({ is_pinned: pinned, updated_at: new Date().toISOString() })
    .eq("id", questionId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/qa`);
}

export async function toggleUpvote(questionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  // Check if already upvoted
  const { data: existing } = await supabase
    .from("question_upvotes")
    .select("id")
    .eq("question_id", questionId)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    await supabase.from("question_upvotes").delete().eq("id", existing.id);
  } else {
    await supabase.from("question_upvotes").insert({
      question_id: questionId,
      user_id: user.id,
    });
  }
}
```

**Step 3: Write queries and tests**

```typescript
// apps/web/src/features/qa/queries.ts
import { createClient } from "@attendly/ui/supabase/server";

export async function getQuestionsBySession(sessionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("session_questions")
    .select("*, profiles:user_id(full_name, avatar_url)")
    .eq("session_id", sessionId)
    .in("status", ["approved", "answered"])
    .order("is_pinned", { ascending: false })
    .order("upvote_count", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getModerationQueue(eventId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("session_questions")
    .select("*, sessions(title), profiles:user_id(full_name)")
    .eq("event_id", eventId)
    .eq("status", "pending")
    .order("created_at");

  if (error) throw new Error(error.message);
  return data;
}

export async function getQAStats(eventId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("session_questions")
    .select("status")
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);

  const stats = { total: data.length, pending: 0, approved: 0, answered: 0, rejected: 0 };
  for (const q of data) {
    stats[q.status as keyof typeof stats]++;
  }
  return stats;
}
```

**Step 4: Run tests and commit**

```bash
npx vitest run src/features/qa/
git add apps/web/src/features/qa/
git commit -m "feat: add Q&A actions, queries, and tests"
```

---

## Task 12: Q&A Organizer Dashboard

**Files:**
- Create: `apps/web/src/app/(organizer)/events/[eventId]/qa/page.tsx`
- Create: `apps/web/src/features/qa/components/moderation-queue.tsx`
- Create: `apps/web/src/features/qa/components/qa-stats.tsx`

**Step 1: Create moderation queue component**

Shows pending questions with session name, question text, timestamp. Bulk approve/reject buttons. Individual approve/reject/pin actions.

**Step 2: Create QA stats component**

Cards showing total questions, pending, approved, answered counts.

**Step 3: Create organizer page**

```typescript
// apps/web/src/app/(organizer)/events/[eventId]/qa/page.tsx
import { getModerationQueue, getQAStats } from "@/features/qa/queries";
import { ModerationQueue } from "@/features/qa/components/moderation-queue";
import { QAStats } from "@/features/qa/components/qa-stats";

export default async function QAPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const [queue, stats] = await Promise.all([
    getModerationQueue(eventId),
    getQAStats(eventId),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Q&A Moderation</h1>
      <QAStats stats={stats} />
      <ModerationQueue eventId={eventId} initialQueue={queue} />
    </div>
  );
}
```

**Step 4: Add to event sub-sidebar**

```typescript
{ href: `/events/${eventId}/qa`, label: "Q&A", icon: "message-circle" }
```

**Step 5: Commit**

```bash
git add apps/web/src/app/\(organizer\)/events/\[eventId\]/qa/ apps/web/src/features/qa/components/
git commit -m "feat: add Q&A organizer dashboard with moderation queue"
```

---

## Task 13: Q&A Attendee UI with Realtime

**Files:**
- Create: `apps/web/src/features/qa/components/qa-panel.tsx`
- Create: `apps/web/src/features/qa/components/question-card.tsx`
- Create: `apps/web/src/features/qa/components/submit-question-form.tsx`

**Step 1: Create QuestionCard component**

Shows: question text, author name (or "Anonymous"), upvote button with count, pinned indicator, answer (if answered) with answerer name. Upvote button calls `toggleUpvote` action.

**Step 2: Create SubmitQuestionForm**

Text input with anonymous toggle checkbox (if `qa_anonymous_enabled`). Submits via `submitQuestion` action.

**Step 3: Create QAPanel with Supabase Realtime**

```typescript
// apps/web/src/features/qa/components/qa-panel.tsx
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@attendly/ui/supabase/client";
import { QuestionCard } from "./question-card";
import { SubmitQuestionForm } from "./submit-question-form";

type Question = {
  id: string;
  question_text: string;
  is_anonymous: boolean;
  is_pinned: boolean;
  upvote_count: number;
  status: string;
  answer_text: string | null;
  created_at: string;
  profiles: { full_name: string; avatar_url: string | null } | null;
};

export function QAPanel({
  sessionId,
  eventId,
  initialQuestions,
  qaEnabled,
  moderationEnabled,
  anonymousEnabled,
}: {
  sessionId: string;
  eventId: string;
  initialQuestions: Question[];
  qaEnabled: boolean;
  moderationEnabled: boolean;
  anonymousEnabled: boolean;
}) {
  const [questions, setQuestions] = useState(initialQuestions);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`qa:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "session_questions",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newQ = payload.new as any;
            if (newQ.status === "approved" || newQ.status === "answered") {
              setQuestions((prev) => [newQ, ...prev]);
            }
          } else if (payload.eventType === "UPDATE") {
            setQuestions((prev) =>
              prev
                .map((q) => (q.id === (payload.new as any).id ? { ...q, ...payload.new } : q))
                .filter((q) => q.status !== "rejected")
            );
          } else if (payload.eventType === "DELETE") {
            setQuestions((prev) => prev.filter((q) => q.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId]);

  if (!qaEnabled) return null;

  const sorted = [...questions].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    return b.upvote_count - a.upvote_count;
  });

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Q&A</h3>
      <SubmitQuestionForm
        sessionId={sessionId}
        eventId={eventId}
        moderationEnabled={moderationEnabled}
        anonymousEnabled={anonymousEnabled}
      />
      <div className="space-y-3">
        {sorted.map((q) => (
          <QuestionCard key={q.id} question={q} />
        ))}
      </div>
    </div>
  );
}
```

**Step 4: Integrate into public schedule page**

In `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/schedule/page.tsx`, for each session with `qa_enabled = true`, render a `<QAPanel>` below the session details.

**Step 5: Commit**

```bash
git add apps/web/src/features/qa/components/ apps/web/src/app/\(public\)/
git commit -m "feat: add attendee Q&A panel with realtime updates and upvoting"
```

---

## Task 14: Navigation & Sub-Sidebar Updates

**Files:**
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/event-sub-sidebar.tsx` (or wherever sidebar groups are configured)
- Modify: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/layout.tsx` (or EventNav component)

**Step 1: Add new items to organizer sub-sidebar**

Under Content group, add:
- `{ href: /events/${eventId}/qa, label: "Q&A", icon: "message-circle" }`
- `{ href: /events/${eventId}/documents, label: "Documents", icon: "file-text" }`

**Step 2: Add public nav links**

Add "Resources" and "Q&A" links to public event navigation.

**Step 3: Commit**

```bash
git add apps/web/src/app/\(organizer\)/events/\[eventId\]/ apps/web/src/app/\(public\)/
git commit -m "feat: add Q&A and Documents to sidebar navigation"
```

---

## Task 15: Final Integration Tests & Cleanup

**Step 1: Run all tests**

```bash
cd /Users/bertwinromero/Documents/billionsoulharves-workspace/attendly/apps/web
npx vitest run
```

**Step 2: Verify dev server builds**

```bash
pnpm --filter @attendly/web build
```

**Step 3: Fix any TypeScript or build errors**

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: fix build errors and finalize Phase A content features"
```

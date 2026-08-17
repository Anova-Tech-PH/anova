# Photo Gallery Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend the existing photo gallery with comments, photo detail view, photo booth frames, profile photo frames, webcam selfie, social sharing, and organizer management pages — full Whova parity.

**Architecture:** Build on existing `event_photos`/`photo_likes` tables and `attendee-photos` bucket. Add 3 new tables, extend 2 existing tables, add 3 organizer sub-pages under Engagement > Photos, and enhance the attendee upload/gallery experience.

**Tech Stack:** Next.js 16, React 19, Supabase (PostgreSQL + Storage), Tailwind 4, Vitest, Canvas API, WebRTC (getUserMedia)

**Design doc:** `docs/plans/2026-08-17-photo-gallery-design.md`

---

## Existing Code Reference

| File | Purpose |
|------|---------|
| `apps/web/src/features/photos/actions.ts` | uploadPhoto, deletePhoto, togglePhotoLike |
| `apps/web/src/features/photos/queries.ts` | getPhotos, getPhotoCount |
| `apps/web/src/features/photos/components/upload-photo-dialog.tsx` | Current upload dialog (drag-drop + preview) |
| `apps/web/src/features/photos/components/photo-card.tsx` | Photo grid card with likes |
| `apps/web/src/features/photos/components/photo-gallery.tsx` | Gallery with tabs + pagination |
| `apps/web/src/features/photos/actions.test.ts` | Test patterns (vi.fn mocking, chainable builders) |
| `apps/web/src/app/(organizer)/events/[eventId]/layout.tsx` | Organizer sidebar — Photos item exists but `disabled: true` (line ~154) |
| `apps/web/src/app/(organizer)/events/[eventId]/event-sub-sidebar.tsx` | Sidebar component with collapsible sections |
| `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/photos/page.tsx` | Public photos page |
| `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/profile/page.tsx` | Attendee profile page |
| Current migration: `091_stripe_payments.sql` | Next migration: 092 |

---

### Task 1: Database Migration

**Files:**
- Create: `packages/supabase/migrations/092_photo_gallery_overhaul.sql`

**Step 1: Write the migration**

```sql
-- Photo comments
CREATE TABLE photo_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES event_photos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL CHECK (char_length(content) <= 140),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_photo_comments_photo ON photo_comments(photo_id, created_at);

GRANT SELECT, INSERT, DELETE ON photo_comments TO authenticated;
GRANT SELECT ON photo_comments TO anon;

ALTER TABLE photo_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can view comments on photos for published events
CREATE POLICY "Anyone can view photo comments" ON photo_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM event_photos ep
      JOIN events e ON e.id = ep.event_id
      WHERE ep.id = photo_comments.photo_id
      AND e.status = 'published'
    )
  );

-- Authenticated users can add comments
CREATE POLICY "Users can add comments" ON photo_comments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete own comments
CREATE POLICY "Users can delete own comments" ON photo_comments
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Org members can delete any comment
CREATE POLICY "Org members can delete comments" ON photo_comments
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM event_photos ep
      JOIN events e ON e.id = ep.event_id
      JOIN organization_members om ON om.organization_id = e.organization_id
      WHERE ep.id = photo_comments.photo_id
      AND om.user_id = auth.uid()
    )
  );

-- Add comments_count to event_photos
ALTER TABLE event_photos ADD COLUMN comments_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE event_photos ADD COLUMN frame_id UUID;

-- Comments count trigger (same pattern as photo_likes trigger in migration 072)
CREATE OR REPLACE FUNCTION update_photo_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE event_photos SET comments_count = comments_count + 1 WHERE id = NEW.photo_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE event_photos SET comments_count = comments_count - 1 WHERE id = OLD.photo_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER photo_comments_count_trigger
  AFTER INSERT OR DELETE ON photo_comments
  FOR EACH ROW EXECUTE FUNCTION update_photo_comments_count();

-- Photo booth frames
CREATE TABLE photo_booth_frames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  message TEXT NOT NULL CHECK (char_length(message) <= 40),
  color TEXT NOT NULL DEFAULT '#3B82F6',
  template TEXT NOT NULL CHECK (template IN ('banner_top', 'banner_bottom', 'corner', 'border')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_photo_booth_frames_event ON photo_booth_frames(event_id, sort_order);

GRANT SELECT ON photo_booth_frames TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON photo_booth_frames TO authenticated;

ALTER TABLE photo_booth_frames ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view booth frames for published events" ON photo_booth_frames
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events e WHERE e.id = photo_booth_frames.event_id AND e.status = 'published'
    )
  );

CREATE POLICY "Org members can view all booth frames" ON photo_booth_frames
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN organization_members om ON om.organization_id = e.organization_id
      WHERE e.id = photo_booth_frames.event_id AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can create booth frames" ON photo_booth_frames
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM events e
      JOIN organization_members om ON om.organization_id = e.organization_id
      WHERE e.id = photo_booth_frames.event_id AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can update booth frames" ON photo_booth_frames
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN organization_members om ON om.organization_id = e.organization_id
      WHERE e.id = photo_booth_frames.event_id AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can delete booth frames" ON photo_booth_frames
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN organization_members om ON om.organization_id = e.organization_id
      WHERE e.id = photo_booth_frames.event_id AND om.user_id = auth.uid()
    )
  );

-- Add frame_id FK now that booth_frames table exists
ALTER TABLE event_photos
  ADD CONSTRAINT event_photos_frame_id_fkey
  FOREIGN KEY (frame_id) REFERENCES photo_booth_frames(id) ON DELETE SET NULL;

-- Profile photo frames
CREATE TABLE profile_photo_frames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  label TEXT NOT NULL CHECK (char_length(label) <= 12),
  color TEXT NOT NULL DEFAULT '#3B82F6',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profile_photo_frames_event ON profile_photo_frames(event_id, sort_order);

GRANT SELECT ON profile_photo_frames TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON profile_photo_frames TO authenticated;

ALTER TABLE profile_photo_frames ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view profile frames for published events" ON profile_photo_frames
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM events e WHERE e.id = profile_photo_frames.event_id AND e.status = 'published'
    )
  );

CREATE POLICY "Org members can view all profile frames" ON profile_photo_frames
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN organization_members om ON om.organization_id = e.organization_id
      WHERE e.id = profile_photo_frames.event_id AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can create profile frames" ON profile_photo_frames
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM events e
      JOIN organization_members om ON om.organization_id = e.organization_id
      WHERE e.id = profile_photo_frames.event_id AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can update profile frames" ON profile_photo_frames
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN organization_members om ON om.organization_id = e.organization_id
      WHERE e.id = profile_photo_frames.event_id AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members can delete profile frames" ON profile_photo_frames
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM events e
      JOIN organization_members om ON om.organization_id = e.organization_id
      WHERE e.id = profile_photo_frames.event_id AND om.user_id = auth.uid()
    )
  );

-- Add profile_frame_id to attendee_profiles
ALTER TABLE attendee_profiles
  ADD COLUMN profile_frame_id UUID REFERENCES profile_photo_frames(id) ON DELETE SET NULL;
```

**Step 2: Apply migration**

Run: `npx supabase migration up`
Expected: All tables created, columns added, triggers active.

**Step 3: Verify**

Run: `npx supabase db query "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('photo_comments','photo_booth_frames','profile_photo_frames')"`
Expected: 3 rows returned.

**Step 4: Commit**

```bash
git add packages/supabase/migrations/092_photo_gallery_overhaul.sql
git commit -m "feat: add photo gallery overhaul migration (comments, booth frames, profile frames)"
```

---

### Task 2: Photo Comment Actions + Queries (TDD)

**Files:**
- Create: `apps/web/src/features/photos/comment-actions.ts`
- Create: `apps/web/src/features/photos/comment-actions.test.ts`
- Modify: `apps/web/src/features/photos/queries.ts` — add getPhotoComments

**Context:** Follow the exact patterns in `actions.ts` and `actions.test.ts` — same Supabase client creation, auth checks, revalidatePath calls, vi.fn() mocking.

**Step 1: Write failing tests**

```typescript
// comment-actions.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { createClient } from "@attendly/ui/supabase/server";
import { addComment, deleteComment } from "./comment-actions";

function mockSupabase(overrides: Record<string, unknown> = {}) {
  const mock = {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) },
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: "comment-1", photo_id: "photo-1", user_id: "user-1", content: "Nice!", created_at: new Date().toISOString() }, error: null }) }) }),
      delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    }),
    ...overrides,
  };
  (createClient as ReturnType<typeof vi.fn>).mockResolvedValue(mock);
  return mock;
}

describe("addComment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws if not authenticated", async () => {
    mockSupabase({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) } });
    await expect(addComment("photo-1", "Nice!")).rejects.toThrow("Not authenticated");
  });

  it("inserts comment and returns it", async () => {
    const mock = mockSupabase();
    const result = await addComment("photo-1", "Nice!");
    expect(mock.from).toHaveBeenCalledWith("photo_comments");
    expect(result).toEqual(expect.objectContaining({ id: "comment-1", content: "Nice!" }));
  });

  it("throws if content exceeds 140 chars", async () => {
    mockSupabase();
    await expect(addComment("photo-1", "x".repeat(141))).rejects.toThrow();
  });
});

describe("deleteComment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("throws if not authenticated", async () => {
    mockSupabase({ auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) } });
    await expect(deleteComment("comment-1")).rejects.toThrow("Not authenticated");
  });

  it("deletes comment by id", async () => {
    const mock = mockSupabase();
    await deleteComment("comment-1");
    expect(mock.from).toHaveBeenCalledWith("photo_comments");
  });
});
```

**Step 2: Run tests — expect FAIL**

Run: `cd apps/web && npx vitest run src/features/photos/comment-actions.test.ts`
Expected: FAIL — module not found

**Step 3: Implement comment-actions.ts**

```typescript
"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function addComment(photoId: string, content: string) {
  if (content.length > 140) throw new Error("Comment must be 140 characters or less");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("photo_comments")
    .insert({ photo_id: photoId, user_id: user.id, content })
    .select()
    .single();

  if (error) throw error;
  revalidatePath("/");
  return data;
}

export async function deleteComment(commentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("photo_comments")
    .delete()
    .eq("id", commentId);

  if (error) throw error;
  revalidatePath("/");
}
```

**Step 4: Add getPhotoWithComments to queries.ts**

Add to `queries.ts`:

```typescript
export async function getPhotoComments(photoId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("photo_comments")
    .select("id, content, created_at, user_id, attendee_profiles!inner(display_name, avatar_url)")
    .eq("photo_id", photoId)
    .order("created_at", { ascending: true });
  return data ?? [];
}
```

**Step 5: Run tests — expect PASS**

Run: `cd apps/web && npx vitest run src/features/photos/comment-actions.test.ts`
Expected: PASS (5 tests)

**Step 6: Commit**

```bash
git add apps/web/src/features/photos/comment-actions.ts apps/web/src/features/photos/comment-actions.test.ts apps/web/src/features/photos/queries.ts
git commit -m "feat: add photo comment actions with tests"
```

---

### Task 3: Photo Detail Modal

**Files:**
- Create: `apps/web/src/features/photos/components/photo-detail-modal.tsx`
- Modify: `apps/web/src/features/photos/components/photo-gallery.tsx` — click card opens modal, deep-link support via `?photo=`

**Context:** The modal shows full-size photo, author info, likes, comments, download button, left/right navigation. Reference existing `photo-card.tsx` for like toggle pattern and `ConfirmDialog` from `@attendly/ui/components` for modal patterns.

**Implementation details:**

- Use `Dialog` from `@attendly/ui/components` as the modal wrapper
- Left side: full photo/video with `<` `>` navigation arrows
- Right side: author avatar+name, caption, Like button (reuse togglePhotoLike), Download button (`<a href={url} download>`), comments list, comment input (140 char limit + counter)
- Fetch comments client-side via `getPhotoComments(photoId)` on modal open
- Optimistic comment add (append to list, revert on error)
- Deep-link: `PhotoGallery` reads `?photo=` from URL, auto-opens modal for matching photo

**Step 1: Build the component** (TDD not practical for complex UI — build then test interaction)

**Step 2: Integrate into PhotoGallery** — wrap PhotoCard in a click handler that sets `selectedPhotoId` state, render PhotoDetailModal when set. Add URL search param reading for deep-link.

**Step 3: Commit**

```bash
git commit -m "feat: add photo detail modal with comments, likes, download, navigation"
```

---

### Task 4: Photo Booth Frame CRUD — Organizer (TDD)

**Files:**
- Create: `apps/web/src/features/photo-booth/queries.ts`
- Create: `apps/web/src/features/photo-booth/actions.ts`
- Create: `apps/web/src/features/photo-booth/actions.test.ts`
- Create: `apps/web/src/features/photo-booth/components/booth-frame-editor.tsx`
- Create: `apps/web/src/features/photo-booth/components/frame-preview.tsx`
- Create: `apps/web/src/app/(organizer)/events/[eventId]/photos/booth/page.tsx`

**Context:** Follow the logistics editor pattern (`features/logistics/`). Organizer creates/edits/deletes photo booth frames. Each frame has: template (banner_top|banner_bottom|corner|border), message (max 40 chars), color (hex). Frame list is sortable.

**Step 1: Write failing tests for actions**

Test createBoothFrame, updateBoothFrame, deleteBoothFrame, reorderBoothFrames — same mock patterns as `actions.test.ts`.

**Step 2: Implement actions**

```typescript
// actions.ts
"use server";
export async function createBoothFrame(eventId: string, template: string, message: string, color: string) { ... }
export async function updateBoothFrame(frameId: string, updates: { message?: string; color?: string; template?: string }) { ... }
export async function deleteBoothFrame(frameId: string) { ... }
export async function reorderBoothFrames(eventId: string, orderedIds: string[]) { ... }
```

**Step 3: Implement queries**

```typescript
// queries.ts
export async function getBoothFrames(eventId: string) {
  // SELECT * FROM photo_booth_frames WHERE event_id = ? ORDER BY sort_order
}
```

**Step 4: Build editor component**

- Header: "Photo Booth" + "Create Frame" button
- Frame cards: preview (color + message on sample image), edit/delete buttons
- Create/Edit dialog: template picker (4 visual options), message input (40 char counter), color picker, live preview
- Delete with ConfirmDialog
- Follow ItemCard pattern from logistics-editor.tsx

**Step 5: Build organizer page**

```typescript
// apps/web/src/app/(organizer)/events/[eventId]/photos/booth/page.tsx
import { getBoothFrames } from "@/features/photo-booth/queries";
import { BoothFrameEditor } from "@/features/photo-booth/components/booth-frame-editor";

export default async function PhotoBoothPage({ params }) {
  const { eventId } = await params;
  const frames = await getBoothFrames(eventId);
  return <BoothFrameEditor eventId={eventId} frames={frames} />;
}
```

**Step 6: Run tests, commit**

```bash
git commit -m "feat: add photo booth frame CRUD for organizers"
```

---

### Task 5: Profile Photo Frame CRUD — Organizer (TDD)

**Files:**
- Create: `apps/web/src/features/profile-frames/queries.ts`
- Create: `apps/web/src/features/profile-frames/actions.ts`
- Create: `apps/web/src/features/profile-frames/actions.test.ts`
- Create: `apps/web/src/features/profile-frames/components/profile-frame-editor.tsx`
- Create: `apps/web/src/features/profile-frames/components/profile-frame-preview.tsx`
- Create: `apps/web/src/app/(organizer)/events/[eventId]/photos/frames/page.tsx`

**Context:** Nearly identical to Task 4 but simpler — profile frames only have label (12 chars) + color. Preview shows a colored ring around a sample avatar with the label as a badge.

**Step 1: Write failing tests** — createProfileFrame, updateProfileFrame, deleteProfileFrame

**Step 2: Implement actions + queries** — same CRUD pattern

**Step 3: Build editor component** — frame cards with colored ring preview, create/edit dialog with label input (12 char counter) + color picker + live avatar preview

**Step 4: Build organizer page**

**Step 5: Run tests, commit**

```bash
git commit -m "feat: add profile photo frame CRUD for organizers"
```

---

### Task 6: Organizer Photo Collection Page

**Files:**
- Create: `apps/web/src/features/photos/components/photo-collection.tsx`
- Create: `apps/web/src/app/(organizer)/events/[eventId]/photos/page.tsx`
- Modify: `apps/web/src/features/photos/queries.ts` — add getPhotoStats

**Context:** Organizer view of all attendee-uploaded photos. Grid view with stats, tab filtering, per-photo delete, bulk delete, download. Reuse existing `getPhotos` query. No upload from organizer side.

**Implementation:**

- Stats header: total photos, total videos, total likes (new `getPhotoStats` query)
- Grid reuses same card layout as public gallery but with checkbox overlay for selection
- Selected count bar: "X selected — Delete Selected"
- Per-card: delete button (trash icon) with ConfirmDialog
- Individual download: `<a>` with download attribute
- "Download All" button — client-side zip generation with JSZip or server action that streams zip
- Tab switching: All / Photos / Videos (reuse getPhotos with tab filter)

**Step 1: Add getPhotoStats to queries.ts**

```typescript
export async function getPhotoStats(eventId: string) {
  const [photos, videos, likes] = await Promise.all([
    supabase.from("event_photos").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("media_type", "photo"),
    supabase.from("event_photos").select("id", { count: "exact", head: true }).eq("event_id", eventId).eq("media_type", "video"),
    supabase.from("event_photos").select("likes_count").eq("event_id", eventId),
  ]);
  return {
    photoCount: photos.count ?? 0,
    videoCount: videos.count ?? 0,
    totalLikes: (likes.data ?? []).reduce((sum, p) => sum + p.likes_count, 0),
  };
}
```

**Step 2: Build PhotoCollection component**

**Step 3: Build organizer page**

**Step 4: Commit**

```bash
git commit -m "feat: add organizer photo collection page with stats, bulk delete, download"
```

---

### Task 7: Enable Photos in Organizer Sidebar

**Files:**
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/layout.tsx` — enable Photos with sub-items

**Context:** The Photos item already exists in the Engagement section at line ~154 but has `disabled: true`. Change it to an enabled collapsible item with 3 children: Photo Collection, Photo Booth, Profile Photo Frames.

**Step 1: Update sidebar config**

Change the Photos entry from:
```typescript
{ href: "#", label: "Photos", icon: "camera", disabled: true }
```
To:
```typescript
{
  label: "Photos",
  icon: "camera",
  children: [
    { href: `/events/${eventId}/photos`, label: "Photo Collection" },
    { href: `/events/${eventId}/photos/booth`, label: "Photo Booth" },
    { href: `/events/${eventId}/photos/frames`, label: "Profile Photo Frames" },
  ],
}
```

Follow the same pattern used by "Community" which has children (Meet-ups, Discussion Topics, Social Groups, Matchmaking).

**Step 2: Verify navigation works** — check all 3 links resolve to the correct pages

**Step 3: Commit**

```bash
git commit -m "feat: enable Photos section in organizer engagement sidebar"
```

---

### Task 8: Frame Selector Component (Shared)

**Files:**
- Create: `apps/web/src/features/photos/components/frame-selector.tsx`

**Context:** Horizontal scroll of available booth frames + "No frame" option. Used in upload dialog and contest gallery. Shows frame preview thumbnails with the message/color. Selected frame gets a ring highlight.

**Props:**
```typescript
{
  frames: BoothFrame[];
  selectedFrameId: string | null;
  onSelect: (frameId: string | null) => void;
}
```

**Implementation:** Horizontal flex container with overflow-x-auto. Each frame is a clickable card showing the colored template preview. First item is "No frame" with an X icon. Selected item has a primary-colored ring border.

**Step 1: Build component**

**Step 2: Commit**

```bash
git commit -m "feat: add shared frame selector component"
```

---

### Task 9: Canvas Frame Rendering Utility

**Files:**
- Create: `apps/web/src/features/photos/lib/render-frame.ts`
- Create: `apps/web/src/features/photos/lib/render-frame.test.ts`

**Context:** Client-side utility that composites a booth frame overlay onto a photo using HTML Canvas. Returns a Blob ready for upload. The frame is "burned in" to the image.

**Step 1: Write failing test**

```typescript
// Test that renderFrameOnPhoto returns a Blob
// Mock canvas context methods
describe("renderFrameOnPhoto", () => {
  it("returns a blob when given image and frame config", async () => { ... });
  it("returns original blob when no frame selected", async () => { ... });
});
```

**Step 2: Implement**

```typescript
// render-frame.ts
export async function renderFrameOnPhoto(
  imageBlob: Blob,
  frame: { template: string; message: string; color: string } | null
): Promise<Blob> {
  if (!frame) return imageBlob;

  const img = await createImageBitmap(imageBlob);
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;

  // Draw original image
  ctx.drawImage(img, 0, 0);

  // Draw frame overlay based on template type
  ctx.fillStyle = frame.color;
  ctx.globalAlpha = 0.85;

  switch (frame.template) {
    case "banner_top":
      ctx.fillRect(0, 0, canvas.width, 60);
      break;
    case "banner_bottom":
      ctx.fillRect(0, canvas.height - 60, canvas.width, 60);
      break;
    case "corner":
      // Rounded corner badge
      break;
    case "border":
      // Full border frame
      ctx.strokeStyle = frame.color;
      ctx.lineWidth = 12;
      ctx.globalAlpha = 0.9;
      ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
      break;
  }

  // Draw message text
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold ${Math.max(16, canvas.width / 25)}px sans-serif`;
  ctx.textAlign = "center";
  // Position based on template...
  ctx.fillText(frame.message, canvas.width / 2, /* y position based on template */);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.92);
  });
}
```

**Step 3: Run tests, commit**

```bash
git commit -m "feat: add canvas frame rendering utility"
```

---

### Task 10: Enhanced Upload Dialog

**Files:**
- Modify: `apps/web/src/features/photos/components/upload-photo-dialog.tsx`

**Context:** Extend the existing dialog with: (1) 4 upload method grid (choose files, drag-drop, paste clipboard, take selfie), (2) frame selection step after photo chosen, (3) batch upload up to 9 photos, (4) post-upload social sharing.

**Implementation flow:**

1. **Method selection** (initial view): 2x2 grid of upload methods
   - Choose photos → existing file picker (accept multiple, max 9)
   - Drag and drop → existing drop zone
   - Paste from clipboard → `navigator.clipboard.read()` on click
   - Take a selfie → opens SelfieCapture component (Task 11)

2. **Preview + frame step** (after photo(s) selected):
   - Photo preview with FrameSelector below
   - Caption input per photo
   - If batch: horizontal thumbnail strip, active photo shown large
   - Frame applies to all photos in batch

3. **Post step** (after successful upload):
   - Social share buttons (Task 12)
   - "Done" to close

**Modify `uploadPhoto` action:** Add optional `frameId` parameter, save to `event_photos.frame_id`.

**Step 1: Update uploadPhoto action to accept frameId**

**Step 2: Rebuild upload dialog with multi-step flow**

**Step 3: Test upload flow manually**

**Step 4: Commit**

```bash
git commit -m "feat: enhance upload dialog with 4 methods, frame selection, batch upload"
```

---

### Task 11: Webcam Selfie Capture

**Files:**
- Create: `apps/web/src/features/photos/components/selfie-capture.tsx`

**Context:** Full-screen camera view using `navigator.mediaDevices.getUserMedia`. Shows live video feed with optional frame overlay. Frame selector at bottom. Capture button freezes frame. Use Photo / Retake options.

**Implementation:**

```typescript
// Props
{
  frames: BoothFrame[];
  onCapture: (blob: Blob, frameId: string | null) => void;
  onCancel: () => void;
}
```

- `useEffect` to init camera stream, cleanup on unmount
- `<video>` element with `autoPlay playsInline` for live feed
- Canvas overlay for frame preview (CSS positioned absolutely over video)
- Capture: draw video frame to canvas, apply frame via `renderFrameOnPhoto`, return blob
- Front/back camera toggle button (mobile)
- Mirror video horizontally for selfie feel

**Step 1: Build component**

**Step 2: Integrate into upload dialog** — "Take a selfie" method opens SelfieCapture, onCapture returns to preview step

**Step 3: Commit**

```bash
git commit -m "feat: add webcam selfie capture with live frame preview"
```

---

### Task 12: Social Sharing Component

**Files:**
- Create: `apps/web/src/features/photos/components/social-share.tsx`

**Context:** Post-upload sharing panel. Uses Web Share API where available, fallback to individual share URL buttons.

**Implementation:**

```typescript
// Props
{
  photoUrl: string;  // public URL to the photo page
  onClose: () => void;
}
```

- Check `navigator.share` availability
- If available: single "Share" button that opens native share sheet
- Fallback buttons: Facebook (`https://www.facebook.com/sharer/sharer.php?u=`), X (`https://twitter.com/intent/tweet?url=`), LinkedIn (`https://www.linkedin.com/sharing/share-offsite/?url=`)
- "Copy link" button with clipboard API + toast confirmation
- "Skip" button to dismiss

**Step 1: Build component**

**Step 2: Integrate into upload dialog** — shown after successful upload

**Step 3: Commit**

```bash
git commit -m "feat: add social sharing component for photos"
```

---

### Task 13: Profile Frame Attendee Integration

**Files:**
- Modify: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/profile/page.tsx` — add "Add Photo Frame" button
- Create: `apps/web/src/features/profile-frames/components/profile-frame-picker.tsx`
- Create: `apps/web/src/features/profile-frames/attendee-actions.ts`
- Modify: avatar component (find where attendee avatars are rendered) — add ring overlay

**Context:** Attendee profile page gets an "Add Photo Frame" button. Opens a picker dialog showing available colored ring frames. Selecting one saves `profile_frame_id` to `attendee_profiles`. The frame renders as a CSS colored ring + label badge on the avatar component everywhere.

**Step 1: Create attendee action**

```typescript
// attendee-actions.ts
"use server";
export async function setProfileFrame(eventId: string, frameId: string | null) {
  // Update attendee_profiles set profile_frame_id = frameId where event_id and user_id match
}
```

**Step 2: Build ProfileFramePicker component** — dialog with grid of frames, each showing colored ring preview + label. Click to select, Submit to apply.

**Step 3: Add "Add Photo Frame" button to profile page**

**Step 4: Modify avatar rendering** — wherever attendee avatars are displayed (attendee list, community posts, photo cards), check for `profile_frame_id` and render a colored ring border + label badge via CSS.

**Step 5: Commit**

```bash
git commit -m "feat: add profile photo frame picker and avatar ring rendering"
```

---

### Task 14: Contest Gallery Frame Integration

**Files:**
- Modify: `apps/web/src/features/gamification/components/contest-gallery.tsx` — add frame selection to photo contest uploads

**Context:** When submitting a photo to a photo contest, attendees should be able to select a booth frame (same as gallery uploads). Reuse the FrameSelector component and renderFrameOnPhoto utility.

**Step 1: Fetch booth frames** — pass available frames to ContestGallery (from parent page query)

**Step 2: Add FrameSelector to photo upload flow** — show after photo is chosen, before submission

**Step 3: Apply frame via Canvas** — use renderFrameOnPhoto before uploading contest photo

**Step 4: Commit**

```bash
git commit -m "feat: integrate booth frame selection into contest photo uploads"
```

---

### Task 15: Deep-Link Support + Final Integration

**Files:**
- Modify: `apps/web/src/features/photos/components/photo-gallery.tsx` — read `?photo=` param
- Modify: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/photos/page.tsx` — pass search params

**Context:** When a user shares a photo URL like `/{orgSlug}/{eventSlug}/photos?photo={photoId}`, the page should auto-open the photo detail modal for that photo.

**Step 1: Pass searchParams to PhotoGallery**

**Step 2: Read `photo` param in PhotoGallery, auto-open PhotoDetailModal if set**

**Step 3: Update URL when opening/closing modal** (use `window.history.replaceState` to avoid full nav)

**Step 4: Final smoke test** — verify full flow: organizer creates frames → attendee uploads photo with frame → photo appears in gallery → click opens detail → comments work → social share generates working link → link deep-opens the photo

**Step 5: Commit**

```bash
git commit -m "feat: add deep-link support for photo detail view"
```

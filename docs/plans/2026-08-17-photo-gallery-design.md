# Photo Gallery Overhaul: Whova-Style Photo Sharing

**Goal:** Extend the existing photo gallery with comments, photo detail view, photo booth frames, profile photo frames, webcam selfie, social sharing, and organizer management pages — full Whova parity.

**Architecture:** Build on existing `event_photos` / `photo_likes` tables and `attendee-photos` storage bucket. Add 3 new tables (`photo_comments`, `photo_booth_frames`, `profile_photo_frames`), extend 2 existing tables, and add 3 organizer sub-pages under Engagement > Photos.

---

## What Exists (No Changes Needed)

- `event_photos` table with likes, captions, media_type (photo|video)
- `photo_likes` table with trigger-based like counting
- Photo gallery page with tabs (All Media / Photos / Videos), pagination, like/unlike
- Upload dialog with drag-and-drop + preview
- `attendee-photos` storage bucket (public, 50MB limit)
- Photo contests integrated with gamification

---

## Database Schema

### New table: `photo_comments`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK, default gen_random_uuid() |
| `photo_id` | UUID | FK → event_photos(id) ON DELETE CASCADE |
| `user_id` | UUID | FK → auth.users(id), NOT NULL |
| `content` | TEXT | NOT NULL, max 140 chars |
| `created_at` | TIMESTAMPTZ | NOT NULL, default now() |

- Index on `(photo_id, created_at)`
- RLS: Anyone can SELECT for published events. Authenticated users can INSERT (own user_id). Users can DELETE own comments. Org members can delete any.
- Trigger: Updates `comments_count` on `event_photos` (same pattern as `photo_likes`).

### New table: `photo_booth_frames`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK, default gen_random_uuid() |
| `event_id` | UUID | FK → events(id) ON DELETE CASCADE, NOT NULL |
| `message` | TEXT | NOT NULL, max 40 chars |
| `color` | TEXT | NOT NULL, default '#3B82F6' (hex) |
| `template` | TEXT | NOT NULL, CHECK IN ('banner_top', 'banner_bottom', 'corner', 'border') |
| `sort_order` | INTEGER | NOT NULL, default 0 |
| `created_at` | TIMESTAMPTZ | NOT NULL, default now() |

- Index on `(event_id, sort_order)`
- RLS: Anyone can SELECT for published events. Org members can INSERT/UPDATE/DELETE.

### New table: `profile_photo_frames`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK, default gen_random_uuid() |
| `event_id` | UUID | FK → events(id) ON DELETE CASCADE, NOT NULL |
| `label` | TEXT | NOT NULL, max 12 chars |
| `color` | TEXT | NOT NULL, default '#3B82F6' |
| `sort_order` | INTEGER | NOT NULL, default 0 |
| `created_at` | TIMESTAMPTZ | NOT NULL, default now() |

- Index on `(event_id, sort_order)`
- RLS: Same as booth frames.

### Modify: `event_photos` — add columns

| Column | Type | Purpose |
|--------|------|---------|
| `frame_id` | UUID | FK → photo_booth_frames(id) ON DELETE SET NULL, nullable |
| `comments_count` | INTEGER | default 0, trigger-updated |

### Modify: `attendee_profiles` — add column

| Column | Type | Purpose |
|--------|------|---------|
| `profile_frame_id` | UUID | FK → profile_photo_frames(id) ON DELETE SET NULL, nullable |

---

## Organizer Pages (Engagement Sidebar)

Under Engagement tab, add collapsible **"Photos"** section with 3 sub-pages.

### Photos > Photo Collection

**Route:** `/events/[eventId]/photos`

- Header with stats (total photos, total videos, total likes)
- Grid view of all uploaded photos/videos
- Each card: thumbnail, author name, likes count, comments count, date
- Per-photo actions: Delete with confirmation
- Bulk actions: Select multiple → Delete selected
- Download: "Download All" (zip) + individual download per photo
- Tab filters: All / Photos / Videos
- No organizer upload — photos come from attendees only

### Photos > Photo Booth

**Route:** `/events/[eventId]/photos/booth`

- Header + "Create Frame" button
- Frame list: cards showing frame preview (color + message on sample photo)
- Create/Edit dialog: template picker (4 types), message input (40 char limit + counter), color picker, live preview
- Delete with confirmation
- Reorder via drag-and-drop
- 2-3 default frames provided on first creation

### Photos > Profile Photo Frames

**Route:** `/events/[eventId]/photos/frames`

- Header + "Add Frame" button
- Frame list: cards showing colored ring preview with label
- Create/Edit dialog: label input (12 char limit + counter), color picker, live preview on sample avatar
- Delete with confirmation
- Reorder via drag-and-drop

---

## Attendee-Side Enhancements

### Photo Detail View (New)

When attendee clicks a photo, opens a modal/lightbox:

- Left: full-size photo/video with left/right navigation arrows
- Right panel: author avatar + name, caption, frame badge (if applied), Like button + count, Download button
- Comments section: list of comments (author + text + timestamp), input (140 chars) + Post button
- "No comments yet, be the first one!" empty state
- "← Back to photo gallery" at top
- Deep-linkable via `?photo={photoId}` query param

### Upload Dialog Enhancements

Modify existing `UploadPhotoDialog` to add:

1. **4 upload methods** (2x2 grid):
   - Choose photos (existing file picker)
   - Drag and drop (existing)
   - Paste from clipboard (`navigator.clipboard.read()`)
   - Take a selfie (webcam via `getUserMedia`)

2. **Frame selection step** (after photo chosen):
   - Horizontal scroll of available booth frames + "No frame" option
   - Selected frame rendered as Canvas overlay on preview
   - Frame burned into image via Canvas API before upload (not stored separately)
   - `frame_id` saved on `event_photos` record for reference

3. **Batch upload:** up to 9 photos, each with its own caption

4. **Post-upload social sharing:**
   - Web Share API where supported, fallback share buttons (Facebook, X, LinkedIn)
   - "Copy link" as universal fallback
   - Skip/Close to dismiss

### Webcam Selfie Flow

1. "Take a selfie" → opens camera view via `getUserMedia`
2. Live frame preview overlay on video feed
3. Frame selector at bottom (horizontal scroll)
4. "Capture" button → freezes frame
5. "Use Photo" / "Retake"
6. Proceeds to caption + post step

### Profile Photo Frames (Attendee Side)

- On Profile page, add "Add Photo Frame" button
- Opens frame picker: grid of colored ring frames with labels
- "Submit" saves `profile_frame_id` to `attendee_profiles`
- Frame renders as CSS colored ring overlay on avatar everywhere it appears

---

## Frame Rendering

### Photo Booth Frames: Canvas (burn-in)
- Client-side HTML Canvas composites frame overlay onto photo before upload
- Frame is permanent in the saved image — works in downloads, social shares
- `frame_id` stored on record for analytics only
- Applied to both gallery uploads and contest entries

### Profile Photo Frames: CSS overlay (dynamic)
- Colored border + label badge rendered around avatar component via CSS
- Changes dynamically when attendee switches frame
- Not burned into any image

---

## Social Sharing

- Web Share API first (covers mobile)
- Fallback: Facebook, X/Twitter, LinkedIn share URL buttons (new tab)
- "Copy link" universal fallback
- Shareable URL: `/{orgSlug}/{eventSlug}/photos?photo={photoId}`
- Query param auto-opens photo detail modal on load
- No per-photo OG meta tags (event defaults sufficient)

---

## Impact on Existing Code

### New Files
- Migration for new tables + column additions
- `features/photos/components/photo-detail-modal.tsx`
- `features/photos/components/frame-selector.tsx`
- `features/photos/components/selfie-capture.tsx`
- `features/photos/components/social-share.tsx`
- `features/photos/comment-actions.ts`
- `features/photo-booth/` — queries, actions, components
- `features/profile-frames/` — queries, actions, components
- Organizer pages: `(organizer)/events/[eventId]/photos/`, `photos/booth/`, `photos/frames/`

### Modify
- `features/photos/components/upload-photo-dialog.tsx` — add 4 methods, frame selection, batch upload, social sharing
- `features/photos/components/photo-card.tsx` — click opens detail modal, show comments count
- `features/photos/components/photo-gallery.tsx` — integrate detail modal, deep-link support
- `features/photos/queries.ts` — add comments fetching, frame joins
- `features/photos/actions.ts` — add frame_id to upload, comment actions
- `features/gamification/components/contest-gallery.tsx` — add frame selection to contest photo uploads
- Attendee profile page — add "Add Photo Frame" button + frame ring rendering
- Avatar component — render profile frame ring overlay
- Organizer sidebar — add Photos section with 3 sub-items

### Leave Alone
- `event_photos` table structure (only adding columns)
- `photo_likes` table and trigger (unchanged)
- Storage buckets (reuse existing)
- Contest actions and queries (unchanged except frame integration in upload)

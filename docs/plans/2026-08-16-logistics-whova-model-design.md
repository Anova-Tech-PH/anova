# Logistics Overhaul: Whova-Style Generic Items

**Goal:** Replace the structured JSONB logistics (dedicated WiFi/Hotels/Contacts fields) with Whova's model — generic logistics items with title + Markdown content, picked from templates.

**Architecture:** Hybrid approach (C) — new `logistics_items` table for generic items, keep `venue_description` and `venue_map_url` on the events table since the website builder's VenueSection depends on them.

---

## Database Schema

### New table: `logistics_items`

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | UUID | PK, default gen_random_uuid() |
| `event_id` | UUID | FK → events(id) ON DELETE CASCADE, NOT NULL |
| `template` | TEXT | NOT NULL, CHECK IN ('welcome', 'venue', 'parking', 'hotel', 'travel_info', 'floor_map', 'custom') |
| `title` | TEXT | NOT NULL, max 100 chars |
| `content` | TEXT | NOT NULL, default '' (Markdown) |
| `sort_order` | INTEGER | NOT NULL, default 0 |
| `created_at` | TIMESTAMPTZ | NOT NULL, default now() |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default now() |

### Migration

- Creates `logistics_items` table with RLS policies
- Drops `logistics` JSONB column from `events` table
- Keeps `venue_description` and `venue_map_url` on events (website builder dependency)
- Index on `(event_id, sort_order)`
- RLS: anyone can SELECT items for published events, org members can INSERT/UPDATE/DELETE

---

## Organizer Editor

Replace the current structured `LogisticsEditor` with an item-based editor.

### Layout

- **Header:** "Logistics" title + "Add Item" dropdown button (template options: Welcome, Venue, Floor Map, Travel Info, Parking, Hotel, Custom)
- **Item list:** Sortable cards, each with:
  - Drag handle for reordering
  - Template badge (colored label)
  - Title input (pre-filled from template name, editable)
  - Markdown textarea with toolbar (Bold, Italic, Link, List)
  - Save button per card
  - Delete button with confirmation dialog
- **Empty state:** "No logistics items yet. Add information like parking, hotels, or directions for your attendees."

### Behavior

- Adding: picks template, creates item with pre-filled title, empty content, appends to end
- Saving: individual save per item (save button per card)
- Reordering: drag-and-drop updates sort_order, persists immediately
- No "Reuse from past events" (YAGNI)

### Server Actions

- `createLogisticsItem(eventId, template, title, content)`
- `updateLogisticsItem(itemId, { title?, content?, sort_order? })`
- `deleteLogisticsItem(itemId)`
- `reorderLogisticsItems(eventId, orderedIds[])`

---

## Public Attendee Page

Replace the current structured page with a simple item renderer.

### Layout

- Page title: "Logistics"
- Each item rendered in sort_order as a section:
  - Template icon (MapPin=venue, Car=parking, Building=hotel, Plane=travel_info, Map=floor_map, PartyPopper=welcome, FileText=custom)
  - Title as `<h2>`
  - Content rendered from Markdown to HTML via `react-markdown`
- Empty state: "No logistics information has been shared yet."

### Key Change

- Public page reads from `logistics_items` table only
- Venue columns stay separate — used by event home/website builder, not the logistics page
- If organizer wants venue info on logistics page, they create a "Venue" template item

---

## Markdown Toolbar

Lightweight, no heavy dependency.

- 4 buttons: Bold, Italic, Link, List
- Wraps selected text or inserts placeholder syntax at cursor
- No preview pane
- Rendering: `react-markdown` (~5KB gzipped), no raw HTML allowed (XSS safety)

---

## Impact on Existing Code

### Delete/Rewrite

- `logistics-editor.tsx` — fully replaced
- `actions.ts` — rewritten with CRUD actions
- `queries.ts` — rewritten to query logistics_items
- `actions.test.ts` — rewritten for new actions

### Modify

- Public `logistics/page.tsx` — rewritten to render items
- Organizer `logistics/page.tsx` — fetch items instead of JSONB

### Leave Alone

- `venue-section.tsx` (website builder) — reads venue columns from events, unaffected
- `event-sidebar.tsx` — logistics link unchanged

### Data Migration

- No automatic migration from JSONB to items (structured data doesn't map cleanly)
- Organizers recreate items in new UI
- Drop `logistics` JSONB column

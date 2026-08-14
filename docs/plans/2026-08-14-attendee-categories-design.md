# Area B: Attendee Categories & Customization — Design

**Date:** 2026-08-14
**Reference:** Whova competitive analysis, Area A (Tickets & Registration Setup) complete
**Scope:** Category management, ticket mapping, visibility matrix, existing feature updates

## What Already Exists

- `registrations.category` freeform text column (migration 057)
- Categories auto-discovered from `SELECT DISTINCT category` on registrations
- Category filtering on attendees table (URL search params)
- Category-based announcement targeting (category / exclude_categories)
- Category-based email segmentation
- CSV import/export with category column
- Add Attendee modal with freeform category datalist

## B1. Attendee Categories Table

**New table: `attendee_categories`**

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `event_id` | UUID FK → events | ON DELETE CASCADE |
| `name` | TEXT NOT NULL | e.g., "Speaker", "VIP", "General" |
| `color` | TEXT NOT NULL | Predefined palette value |
| `is_visible_in_directory` | BOOLEAN DEFAULT true | Whether members appear in public attendee directory |
| `sort_order` | INT NOT NULL DEFAULT 0 | Display ordering |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

Unique constraint on `(event_id, name)`.

**Color palette:** 8 predefined colors — `blue`, `green`, `red`, `purple`, `orange`, `pink`, `yellow`, `gray`.

## B2. Ticket-to-Category Mapping

**New table: `ticket_type_categories`** (join table, many-to-many ready)

| Column | Type | Notes |
|--------|------|-------|
| `ticket_type_id` | UUID FK → ticket_types | ON DELETE CASCADE |
| `category_id` | UUID FK → attendee_categories | ON DELETE CASCADE |

PK on `(ticket_type_id, category_id)`.

UI enforces one category per ticket for now. Schema supports many-to-many later.

**Ticket form update:** Add "Category" dropdown on ticket create/edit form showing defined `attendee_categories` for the event.

**Registration flow:** When a registration is confirmed, if the ticket type has a mapped category, auto-set `registrations.category_id`.

## B3. Category Visibility Matrix

**New table: `category_visibility`**

| Column | Type | Notes |
|--------|------|-------|
| `viewer_category_id` | UUID FK → attendee_categories | ON DELETE CASCADE |
| `visible_category_id` | UUID FK → attendee_categories | ON DELETE CASCADE |

PK on `(viewer_category_id, visible_category_id)`.

If a row exists, members of `viewer_category_id` can see members of `visible_category_id` in the public attendee directory.

**Behavior:**
- Defaults: all-to-all visibility (every pair gets a row on creation)
- New categories auto-insert bidirectional visibility rows with all existing categories
- Categories with `is_visible_in_directory = false` are hidden from everyone regardless of matrix
- Matrix UI: grid with checkboxes, rows = viewer categories, columns = visible categories
- Changes save on toggle (optimistic update)

## B4. Registration Category FK

**Modified table: `registrations`**
- Add `category_id` UUID FK → attendee_categories (nullable)
- Keep existing `category` text column during migration, deprecate after backfill

## B5. Category Management Page

**Route:** `/events/[eventId]/attendee-categories`

**Navigation:** Add to Attendees tab sidebar:
```
Manage Attendees (parent)
  ├── Attendees
  ├── Attendee Limit Upgrade
  ├── Attendee Categories    ← NEW
Check-in
Badges
```

**Page layout:**
- Header with "Add Category" button
- Category list: color dot, name, ticket mappings, directory visibility toggle, sort handle, edit/delete actions
- Visibility matrix section (below category list, shown when 2+ categories)

**Add/Edit Category dialog:**
- Name (text input)
- Color (palette grid — 8 swatches)
- Visible in directory (toggle)
- Ticket mapping (dropdown of ticket types)

**Delete:** Nulls `category_id` on associated registrations. Removes visibility matrix rows.

## B6. Existing Feature Updates

| Component | Change |
|-----------|--------|
| Attendees table filter | Use `attendee_categories` instead of `SELECT DISTINCT category` |
| Attendees table display | Show color dot + category name from FK |
| Add Attendee modal | Dropdown of defined categories instead of freeform datalist |
| Announcement composer | Category targeting uses `attendee_categories` list |
| Email segments | Filter by `category_id` instead of text match |
| CSV export | Resolve `category_id` to category name |
| CSV import | Match category text to existing `attendee_categories` by name; create new if no match |
| Ticket form | Add category dropdown |

## Summary of DB Changes

| Change | Type |
|--------|------|
| `attendee_categories` | New table |
| `ticket_type_categories` | New table |
| `category_visibility` | New table |
| `registrations.category_id` | New column (FK) |

## Data Migration

Single migration to:
1. Create `attendee_categories` rows from distinct non-null `registrations.category` values per event (default color: "blue")
2. Backfill `registrations.category_id` from matching `attendee_categories`
3. Insert default all-to-all `category_visibility` rows

## Implementation Order

B1 (schema + categories table) → B2 (ticket mapping) → B3 (visibility matrix) → B4 (registration FK + migration) → B5 (management page) → B6 (existing feature updates)

# Design: Announcements Upgrade (Whova Parity)

**Date:** 2026-08-13
**Goal:** Upgrade Attendly's Announcements feature to full Whova parity, plus retain channel selection as an advantage.

## Context

Current Attendly announcements have basic functionality (subject, plain text body, all/ticket-type targeting, draft/send, delete). Whova's announcements are significantly more polished with a rich text editor, 7 audience targeting options, templates, separate drafts/sent tables, and a modal composer.

## Database Changes

### New columns on `announcements` table

- `sender_name` (text, nullable) — custom sender display name
- `reply_to_email` (text, nullable) — reply-to email address
- `signature` (text, nullable) — auto-appended footer text

### New `announcement_templates` table

```sql
create table announcement_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  event_id uuid references events(id) on delete cascade, -- null = org-wide
  name text not null,
  subject text not null default '',
  body text not null default '',
  type text not null default 'custom', -- 'quick_reminder' | 'custom'
  created_at timestamptz not null default now()
);
```

### Expanded `target_audience` JSONB

Support 7 audience types:

```json
{ "type": "all" }
{ "type": "ticket_types", "ticket_type_ids": ["..."] }
{ "type": "category", "category": "..." }
{ "type": "segment", "segment_id": "..." }
{ "type": "session_attendees", "session_id": "..." }
{ "type": "manual", "attendee_ids": ["..."] }
{ "type": "exclude_categories", "excluded_categories": ["..."] }
```

## Composer UI (Modal Dialog)

### Trigger Buttons (top of page)

| Button | Style | Behavior |
|--------|-------|----------|
| Start from scratch | Primary, filled | Opens empty composer modal |
| Quick reminder | Primary, filled | Opens composer pre-filled with reminder template |
| Reuse past announcement | Outline | Opens picker of sent announcements, loads selection into composer |
| From other organizers | Outline | Shows templates from other events in same org |

### Modal Form Fields (top to bottom)

1. **Recipients** — radio group with 7 options
   - All attendees (shows count, e.g. "All attendees (749)")
   - Specific attendee ticket type → shows ticket type checkboxes
   - Specific attendee category → shows category dropdown
   - Specific attendee segment → shows segment dropdown
   - Attendees who added a specific session → shows session dropdown
   - Manually add attendees → shows attendee search/select
   - All attendees except selected categories → shows category checkboxes
2. **Sender name** — text input, pre-filled from user profile
3. **Reply-to-email** — text input, pre-filled from user email
4. **Subject** — text input, required
5. **Body** — Tiptap rich text editor
   - Toolbar: Bold, Italic, Underline, Font size, Text alignment (left/center/right/justify), Text color, Highlight color, Clear formatting
6. **Channels** — checkboxes: In-App, Email, Push Notification (default: In-App checked)
7. **Auto-signature preview** — read-only footer: "Name, Organizer, Event Title"

### Modal Actions (bottom)

- Cancel (left)
- Send myself test (outline, right group)
- Save draft (outline, right group)
- Send (primary, right group — with confirmation dialog before sending)

## List Layout

### Page Structure (top to bottom)

1. **Header** — "Announcements" title + description
2. **Stats bar** — Total sent count, Drafts count, Total recipients reached
3. **4 action buttons** — Start from scratch, Quick reminder, Reuse past, From other organizers
4. **Drafts section**
   - Table columns: Subject, Send to, Time created, Actions (Edit, Delete)
   - Edit opens composer modal pre-filled with draft data
   - Empty state with CTA: "No drafts — create an announcement above"
5. **Sent section**
   - Table columns: Subject, Sent to, Time sent, Actions dropdown
   - Actions dropdown: View details, Copy and compose new, Delete
   - Empty state with CTA
6. **Pagination** — 10 per page with page navigation on both tables

### Table Features

- Sortable columns (click header to toggle asc/desc on Subject and Time)
- Pagination (10 per page)

### Sent Detail View

Read-only modal showing:
- Recipients (disabled radio group showing selection)
- Sender name, Reply-to-email (read-only)
- Subject (read-only)
- Body (rendered HTML)
- Footer: "Copy and compose new" button

## Backend

### Server Actions

| Action | Description |
|--------|-------------|
| `createAnnouncement` | Updated — includes `sender_name`, `reply_to_email`, `signature` |
| `updateAnnouncement` | Updated — supports editing all draft fields |
| `deleteAnnouncement` | Unchanged |
| `sendAnnouncement` | Updated — uses `sender_name`/`reply_to_email` in email, appends signature |
| `sendTestAnnouncement` | NEW — sends to current user's email only, doesn't change status |
| `duplicateAnnouncement` | NEW — copies sent announcement into new draft |
| `createTemplate` | NEW — save announcement as reusable template |
| `getTemplates` | NEW — fetch templates for current event + org-wide |
| `getOrgTemplates` | NEW — fetch templates from other events in same org |
| `deleteTemplate` | NEW — remove a template |

### Queries

| Query | Description |
|-------|-------------|
| `getAnnouncements` | Updated — add pagination (`page`, `pageSize`), return `{ drafts, sent, totalDrafts, totalSent }` |
| `getRecipientCount` | NEW — returns count for a given audience config |

### Segmented Recipients Expansion

`getSegmentedRecipients` expanded to handle all 7 audience types:

- `all` — all registrations for the event
- `ticket_types` — filter by ticket_type_id
- `category` — filter by attendee category field
- `segment` — filter by segment (add-on purchase or registration response)
- `session_attendees` — attendees who RSVP'd to a specific session
- `manual` — lookup by specific attendee IDs
- `exclude_categories` — all except attendees in selected categories

## Dependencies

- **Tiptap** (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-*`) — rich text editor
- No other new dependencies needed

## What We Keep Over Whova

- **Channel selection** (In-App, Email, Push) — Whova doesn't expose this to organizers
- **Read count** tracking visible in the table

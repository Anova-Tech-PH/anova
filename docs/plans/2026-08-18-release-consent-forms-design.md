# Release & Consent Forms — Design Document

**Date:** 2026-08-18
**Status:** Approved

## Goal

Build a general event compliance tool that lets organizers create, distribute, and track signed waivers and consent forms for attendees, speakers, and volunteers. Modeled after Whova's Release & Consent Forms feature.

## Architecture

A standalone feature module under Attendees with its own migration (3 tables), server actions, queries, and components. Organizers create up to 2 forms per event from templates or scratch, build them with 5 element types, publish and distribute via email or shareable link, and track submissions. Forms can be enforced at check-in.

## Data Model

### `consent_forms` (max 2 per event)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| event_id | uuid FK -> events | ON DELETE CASCADE |
| title | text NOT NULL | e.g., "Liability Waiver" |
| description | text | optional intro text |
| audience | text NOT NULL | `all`, `attendees`, `speakers`, `volunteers` |
| require_before_checkin | boolean | default false |
| status | text NOT NULL | `draft`, `published` |
| created_at | timestamptz | default now() |
| updated_at | timestamptz | default now() |

Max 2 forms per event enforced at app level (check count before insert).

### `consent_form_elements` (ordered form content)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| form_id | uuid FK -> consent_forms | ON DELETE CASCADE |
| type | text NOT NULL | `description`, `checkbox`, `text`, `textarea`, `signature` |
| label | text NOT NULL | element label or content |
| is_required | boolean | default true |
| sort_order | int NOT NULL | default 0 |
| created_at | timestamptz | default now() |

### `consent_form_submissions` (one per person per form)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| form_id | uuid FK -> consent_forms | ON DELETE CASCADE |
| event_id | uuid FK -> events | for easier querying |
| user_id | uuid FK -> auth.users | nullable |
| email | text NOT NULL | signer's email |
| name | text NOT NULL | signer's name |
| signed_name | text NOT NULL | typed legal name (signature) |
| answers | jsonb NOT NULL | `{ elementId: value }` map |
| signed_at | timestamptz NOT NULL | auto-captured |
| created_at | timestamptz NOT NULL | default now() |

UNIQUE constraint on `(form_id, email)`.

### RLS Policies

- **Org members** can manage all three tables (using `has_event_access(event_id, 'admin')`)
- **Public/anon** can SELECT `consent_forms` and `consent_form_elements` where form status = `published`
- **Public/anon** can INSERT into `consent_form_submissions` where form status = `published`
- **Authenticated users** can SELECT their own submissions

## Feature Module

```
apps/web/src/features/consent-forms/
  actions.ts        # CRUD for forms & elements, send emails, send reminders
  queries.ts        # fetch forms, elements, submissions, stats
  components/
    consent-forms-page-client.tsx   # main page: list of forms (max 2 cards)
    form-builder.tsx               # add/reorder/delete elements
    form-settings.tsx              # title, audience, require_before_checkin
    submissions-table.tsx          # signed/unsigned list, export CSV
    public-consent-form.tsx        # public-facing signing form
```

## Pages

### Organizer Pages

- **`/events/[eventId]/consent-forms/`** — Main page showing up to 2 form cards. Each card displays title, audience badge, status (draft/published), submission count. "Create Form" button disabled when 2 exist.
- **`/events/[eventId]/consent-forms/[formId]/`** — Form detail with two tabs: Builder (add/edit/reorder elements) and Submissions (table of responses, send reminders button).

### Public Page

- **`/[orgSlug]/[eventSlug]/consent/[formId]/`** — Public form for signing. Shows form title, description blocks, checkboxes, text fields, and typed-name signature at bottom. Requires email to identify signer. Shows confirmation on success, "already signed" message if duplicate.

## Navigation

- Sidebar link under **Attendees** section: "Release & Consent Forms"
- Convenience link under **Call for Volunteers** that navigates to the same page
- Remove existing ComingSoon placeholder pages

## Templates

On "Create Form," offer pre-built templates plus blank:

1. **Speaker media release** — Permission to use photos/videos/recordings from sessions
2. **Volunteer liability waiver** — Acknowledge risks for setup/equipment tasks
3. **Photo and video consent** — Permission to use event photos for marketing
4. **Event code of conduct** — Review and agree before participating
5. **Excursion/activity waiver** — Liability waiver for tours/games/physical activities
6. **Start from scratch** — Empty form

Templates pre-populate elements. Organizer can edit everything after creation.

## Form Element Types

| Type | Description | Example |
|------|-------------|---------|
| `description` | Read-only text block | Waiver terms, policy text |
| `checkbox` | "I agree" acknowledgment | "I acknowledge the risks involved" |
| `text` | Short text input | Emergency contact name |
| `textarea` | Multi-line text | Additional comments |
| `signature` | Typed legal name + auto date | Full legal name field |

Every form must have exactly one `signature` element (enforced at app level).

## Workflows

### Organizer Workflow

1. Create form -> pick template or blank -> lands on builder
2. Build form -> add description blocks, checkboxes, text fields, signature
3. Configure settings -> audience, require before check-in toggle
4. Publish -> status = published, form accessible via public URL
5. Distribute -> copy link or "Send Form" to email targeted participants
6. Monitor -> submissions table shows signed/unsigned per person
7. Send Reminders -> emails all unsigned participants

### Check-in Enforcement

When `require_before_checkin` is true:
- Kiosk mode queries submissions for attendee's email
- If unsigned -> show warning with QR code/link to sign on phone
- Organizer can override with "Check in anyway" checkbox

### Public Form Flow

1. Open link -> see form title + elements
2. Fill out checkboxes, text fields
3. Type full legal name in signature field
4. Submit -> submission recorded with signed_at timestamp
5. Confirmation: "Thank you - your form has been submitted"
6. Already submitted -> "You've already signed this form" with date

## Email Integration

Two email types using existing `sendEmail` pattern:

- **Form request** — "Please review and sign [Form Title] for [Event Name]" with link
- **Reminder** — "Reminder: [Form Title] still needs your signature"

Bulk sends use fire-and-forget (setTimeout) pattern from volunteer invitations.

## Scope

### In Scope (MVP)

- Form CRUD (max 2 per event)
- 5 element types: description, checkbox, text, textarea, signature
- 5 templates + blank
- Audience targeting (all/attendees/speakers/volunteers)
- Draft/published status
- Public signing page
- Submissions table with signed/unsigned tracking
- Manual "Send Form" and "Send Reminders" emails
- Check-in enforcement flag
- CSV export of submissions

### Not In Scope

- Canvas/drawn signatures
- PDF generation of signed forms
- Automatic scheduled reminders
- Form versioning/audit trail
- Minor/guardian consent workflows
- Drag-and-drop reordering (use up/down arrows)
- Rich text editor for description blocks (plain textarea)

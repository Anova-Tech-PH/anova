# Attendee Profile Extensions Design — COMPLETED

**Status:** Implemented and tested (2026-08-16)

**Goal:** Add Affiliations, Education, and Links sections to attendee profiles for Whova parity.

**Context:** Whova attendees self-populate their profile after joining an event. Profile data is visible to other attendees and used for "Recommended" matching. Our app currently supports name, avatar, title, company, location, bio, and interests. We're adding the three missing sections.

---

## Database Schema

### New Tables

**`attendee_affiliations`** — work history entries (separate table for cross-attendee matching)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | gen_random_uuid() |
| user_id | uuid FK → auth.users | ON DELETE CASCADE |
| event_id | uuid FK → events | ON DELETE CASCADE |
| organization | text NOT NULL | max 200 chars |
| role | text | max 200 chars |
| start_date | text | "YYYY-MM" format |
| end_date | text | "YYYY-MM" or null = Present |
| sort_order | int DEFAULT 0 | |
| created_at | timestamptz | |

Index: `(event_id, user_id)`
RLS: Attendees view all for published events, manage own.

**`attendee_education`** — education history entries (separate table for cross-attendee matching)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | gen_random_uuid() |
| user_id | uuid FK → auth.users | ON DELETE CASCADE |
| event_id | uuid FK → events | ON DELETE CASCADE |
| school | text NOT NULL | max 200 chars |
| degree | text | max 200 chars |
| field_of_study | text | max 200 chars |
| start_year | int | |
| end_year | int | null = Present |
| sort_order | int DEFAULT 0 | |
| created_at | timestamptz | |

Index: `(event_id, user_id)`
RLS: Same as affiliations.

### Modified Table

Add JSONB column to `attendee_profiles`:

```sql
ALTER TABLE public.attendee_profiles ADD COLUMN links jsonb NOT NULL DEFAULT '[]';
```

Links shape: `[{ type: "linkedin"|"twitter"|"github"|"website"|"other", url: string, label?: string }]`

Rationale: Links don't have cross-attendee matching value, so JSONB is simpler than a separate table.

---

## UI — Profile Edit Page

Three new sections added to `ProfileEditor`, in order:

1. Name/Avatar (existing)
2. Title/Company/Location (existing)
3. **Affiliations** (new) — list of entries with Edit/Remove, "+ Add affiliation" inline form
   - Fields: Organization (required), Role, Start date (month picker), End date (month picker or "Present" checkbox)
4. **Education** (new) — list of entries with Edit/Remove, "+ Add education" inline form
   - Fields: School (required), Degree, Field of study, Start year, End year (or "Present" checkbox)
5. Bio (existing)
6. Interests (existing)
7. **Links** (new) — list with auto-detected icons, Remove button, "+ Add link" inline form
   - Fields: Type dropdown (LinkedIn, Twitter/X, GitHub, Website, Other), URL (required), Label (optional)
8. Directory visibility toggle (existing)

---

## UI — Profile View Page

New sections in `AttendeeProfileView`, rendered only when data exists:

1. Header with avatar, name, title, company, location (existing)
2. Action buttons (existing)
3. **Affiliations** — org name bold, role + date range below
4. **Education** — school name bold, degree + field + years below
5. About/Bio (existing)
6. Interests (existing)
7. **Links** — clickable links with auto-detected icons, open in new tab

**Auto-icon detection:**
- `linkedin.com` → LinkedIn icon
- `twitter.com` or `x.com` → Twitter icon
- `github.com` → GitHub icon
- Everything else → Globe icon

Display label if provided, otherwise show domain name.

**Attendee Card** — no changes. Card shows name/title/company/location; details on profile page.

---

## Server Actions & Queries

### New Actions

- `addAffiliation(eventId, data)` — insert
- `updateAffiliation(id, data)` — update (verify ownership)
- `removeAffiliation(id)` — delete (verify ownership)
- `addEducation(eventId, data)` — insert
- `updateEducation(id, data)` — update (verify ownership)
- `removeEducation(id)` — delete (verify ownership)
- `updateProfileLinks(eventId, links)` — update JSONB column

### New Queries

- `getAttendeeAffiliations(eventId, userId)` — fetch affiliations
- `getAttendeeEducation(eventId, userId)` — fetch education
- Links: included in existing `attendee_profiles` select (add `links` to column list)

### Validation

- Organization/School: required, max 200 chars
- Role/Degree/Field: optional, max 200 chars
- Dates: optional, validated format
- URL: required, must start with `https://` or `http://`
- Max 10 affiliations, 10 education entries, 10 links per profile

---

## Files to Create/Modify

**Create:**
- `packages/supabase/migrations/087_attendee_profile_extensions.sql`

**Modify:**
- `apps/web/src/features/attendee-profile/queries.ts` — add affiliation/education queries, add `links` to profile selects
- `apps/web/src/features/attendee-profile/actions.ts` — add CRUD actions for affiliations, education, links
- `apps/web/src/features/attendee-profile/components/profile-editor.tsx` — add 3 new sections
- `apps/web/src/features/attendee-profile/components/attendee-profile-view.tsx` — render new sections
- `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/profile/page.tsx` — fetch new data
- `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/attendees/[userId]/page.tsx` — fetch new data

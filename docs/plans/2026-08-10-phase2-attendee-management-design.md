# Phase 2: Attendee Management — Design Document

**Goal:** Add four attendee management features modeled after Whova: name badges, kiosk check-in, auto-segments, and criteria-based certificates.

**Stack:** Next.js 16, React 19, Supabase (PostgreSQL + RLS), Tailwind CSS 4, jsPDF, qrcode

---

## Feature 1: Name Badges (PDF Generation)

Organizers generate printable PDF badges for attendees. Each badge includes the attendee's name, company/job title, ticket type, a QR code (reusing the existing `registrations.qr_code`), and optional segment labels.

### How It Works

- New "Badges" tab in the organizer event dashboard.
- Badge configurator lets the organizer choose which fields to display and optionally color-code by ticket type.
- Attendee list can be filtered by ticket type, status, or custom field values before generating.
- "Generate PDF" produces a client-side PDF via jsPDF with badges laid out in a 2x2 grid on landscape A4 pages.
- QR codes rendered with the `qrcode` library (canvas-based, embedded into PDF).

### Data Sources (no new tables)

- `registrations` — name, email, qr_code, custom_fields, status
- `ticket_types` — ticket name, for color-coding and labels
- `profiles` — company, job_title (joined via user_id when available)

### New Files

| Path | Purpose |
|------|---------|
| `features/badges/generate-badges.ts` | jsPDF badge generation logic |
| `features/badges/components/badge-configurator.tsx` | Field selection, filters, preview |
| `app/(organizer)/events/[eventId]/badges/page.tsx` | Organizer page |

### Badge Layout (per badge, ~95x65mm)

```
+-------------------------------+
| [COLOR BAR by ticket type]    |
| [QR CODE]   ATTENDEE NAME    |
|             Company Name      |
|             Job Title          |
|             ─────────          |
|             TICKET TYPE        |
|             [VEG] [SPEAKER]   |
+-------------------------------+
```

---

## Feature 2: Kiosk Check-in (Self-Service Mode)

Full-screen self-service check-in. Attendees walk up, scan their QR code or search by name, see a welcome confirmation, and the screen auto-resets.

### How It Works

- Organizer clicks "Launch Kiosk" from the existing check-in page, which opens a dedicated full-screen route.
- The kiosk layout shows event branding at the top, a large QR scanner in the center, and a "Search by name" button below.
- **QR flow:** Scan QR code -> instant check-in -> "Welcome, [Name]!" splash with ticket type -> auto-resets after 4 seconds.
- **Name search flow:** Attendee taps "Search by name" -> types name or email -> taps their entry from results -> confirms identity -> checked in.
- Duplicate check-ins show a friendly "Already checked in" message.
- Reuses existing `checkInByQrCode` action. Adds a new `checkInByRegistrationId` action for the name search flow.

### Data Sources (no new tables)

- `registrations` — lookup by qr_code or name/email search
- `check_ins` — insert check-in record
- `ticket_types` — display ticket name on welcome screen

### New Files

| Path | Purpose |
|------|---------|
| `app/(organizer)/events/[eventId]/check-in/kiosk/page.tsx` | Full-screen kiosk route |
| `features/registration/components/kiosk-mode.tsx` | Kiosk UI (scanner + search + welcome splash) |

### Modified Files

| Path | Change |
|------|--------|
| `features/registration/actions.ts` | Add `checkInByRegistrationId` action |
| `app/(organizer)/events/[eventId]/check-in/page.tsx` | Add "Launch Kiosk" button |

---

## Feature 3: Attendee Segments (Whova-style Auto-Segments)

Auto-generated attendee groups based on existing registration data. Organizer-only — not visible to attendees. Used for targeted announcements, emails, badge labels, and filtered exports.

### How It Works

Segments are filter definitions applied at query time, not stored groups. Filters combine:

- **Ticket type** — which ticket(s) the attendee purchased
- **Registration status** — pending, confirmed, checked_in, cancelled
- **Check-in count** — number of sessions attended (from `check_ins` table)
- **Custom field values** — answers from `registrations.custom_fields` JSONB (e.g., dietary = "Vegetarian")

### Integration Points

| Feature | How segments are used |
|---------|----------------------|
| **Registrations table** | New filter panel with segment criteria, real-time attendee count |
| **Emails** | Extend `getSegmentedRecipients` to accept custom field filters |
| **Announcements** | Extend `target_audience` JSONB to support segment filters |
| **Badges** | Filter which attendees to generate badges for; segment labels on badges |
| **CSV export** | Apply segment filters before export |

### Data Sources (no new tables)

- `registrations` — custom_fields JSONB, status
- `ticket_types` — ticket filtering
- `check_ins` — check-in count aggregation
- `custom_registration_fields` — field definitions for building filter UI

### New Files

| Path | Purpose |
|------|---------|
| `features/registration/components/segment-filter.tsx` | Reusable segment filter panel |

### Modified Files

| Path | Change |
|------|--------|
| `features/emails/lib/segments.ts` | Add custom field and check-in count filtering |
| `features/registration/components/registrations-table.tsx` | Integrate segment filter panel |
| `features/registration/queries.ts` | Add `getFilteredRegistrations` with segment params |
| `features/announcements/components/announcement-composer.tsx` | Add segment-based audience picker |

---

## Feature 4: Certificates (Criteria-Based, Whova-style)

Organizers set eligibility criteria (minimum session check-ins, required sessions). The system auto-identifies qualified attendees. Certificates are generated as PDFs and distributed via email, with on-demand download for attendees.

### How It Works

- New "Certificates" tab in the organizer event dashboard.
- Organizer configures eligibility:
  - Minimum check-in count (e.g., "attended 3+ sessions")
  - Optionally require specific sessions (e.g., "must attend Keynote")
  - Custom fields on the certificate (credit hours, affiliation)
- System queries `check_ins` to find eligible registrations and shows a preview list with counts.
- "Generate & Send" batch-generates PDFs via existing jsPDF code and emails them through the existing email system.
- Attendees can also download their certificate from the public event page (if eligible).

### New Tables

**`certificate_configs`**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| event_id | UUID FK -> events | unique per event |
| title | TEXT | e.g., "Certificate of Attendance" |
| min_check_ins | INT | minimum sessions attended, default 1 |
| required_session_ids | UUID[] | optional specific sessions required |
| custom_fields | JSONB | e.g., `{"credit_hours": "5 CEU"}` |
| template_style | TEXT | e.g., "classic", "modern" |
| enabled | BOOLEAN | default false |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**`certificates_issued`**

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| config_id | UUID FK -> certificate_configs | |
| registration_id | UUID FK -> registrations | unique per config |
| issued_at | TIMESTAMPTZ | |
| emailed_at | TIMESTAMPTZ | null if not yet emailed |

### RLS Policies

- `certificate_configs`: Org editors can manage (same pattern as announcements).
- `certificates_issued`: Org members can view all; attendees can view their own.

### New Files

| Path | Purpose |
|------|---------|
| `features/certificates/components/certificate-config.tsx` | Eligibility config UI |
| `features/certificates/components/eligible-attendees.tsx` | Preview list of eligible attendees |
| `features/certificates/actions.ts` | Save config, generate, send certificates |
| `features/certificates/queries.ts` | Already exists — extend with eligibility query |
| `app/(organizer)/events/[eventId]/certificates/page.tsx` | Organizer page |
| `app/(public)/[orgSlug]/[eventSlug]/certificate/page.tsx` | Attendee download page |
| Migration `032_certificates.sql` | New tables + RLS + grants |

### Modified Files

| Path | Change |
|------|--------|
| `features/certificates/generate-certificate.ts` | Add custom fields, template styles |
| `app/(organizer)/events/[eventId]/layout.tsx` | Add "Certificates" and "Badges" tabs |
| `app/(public)/[orgSlug]/[eventSlug]/event-nav.tsx` | Add "Certificate" nav item |

---

## Summary of Database Changes

| Change | Type |
|--------|------|
| `certificate_configs` table | New |
| `certificates_issued` table | New |
| RLS policies + grants for above | New |
| No changes to existing tables | — |

All other features (badges, kiosk, segments) use existing tables with no schema changes.

---

## Nav Changes

### Organizer Dashboard (layout.tsx)

Add two new tabs:
- "Badges" (after Check-in)
- "Certificates" (after Survey)

### Public Event Page (event-nav.tsx)

Add one new nav item:
- "Certificate" (for eligible attendees to download)

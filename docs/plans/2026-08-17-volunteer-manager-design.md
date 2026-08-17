# Volunteer Manager Design

## Goal

Build a complete Call for Volunteers system matching Whova's feature set: public application portal, organizer-side applicant management, and email invitation/reminder system.

## Database Schema

### `volunteer_settings`
Per-event configuration for the volunteer program.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| event_id | uuid FK (unique) | One settings row per event |
| title | text | Application portal title |
| instructions | text | Rich text instructions |
| banner_image_url | text | Nullable |
| application_deadline | timestamptz | Nullable |
| auto_accept | boolean | Default false |
| auto_add_to_attendees | boolean | Default false |
| is_published | boolean | Default false |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `volunteer_roles`
Roles available for an event's volunteer program.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| event_id | uuid FK | |
| name | text | |
| description | text | Nullable |
| max_volunteers | int | Nullable (unlimited if null) |
| role_type | text | `built_in` or `custom` |
| built_in_key | text | Nullable: `session_moderator`, `community_moderator`, `checkin_staff` |
| sort_order | int | |
| created_at | timestamptz | |

### `volunteer_questions`
Custom application questions.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| event_id | uuid FK | |
| question_text | text | |
| is_required | boolean | Default false |
| sort_order | int | |
| created_at | timestamptz | |

### `volunteer_applications`
Submitted applications.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| event_id | uuid FK | |
| user_id | uuid FK | Nullable (for logged-in users) |
| email | text | |
| name | text | |
| phone | text | Nullable |
| organization | text | Nullable |
| status | text | `pending`, `accepted`, `rejected` |
| accepted_at | timestamptz | Nullable |
| rejected_at | timestamptz | Nullable |
| notes | text | Organizer notes, nullable |
| created_at | timestamptz | |

Unique constraint on (event_id, email) to prevent duplicate applications.

### `volunteer_application_answers`
Answers to custom questions.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| application_id | uuid FK | CASCADE delete |
| question_id | uuid FK | |
| answer_text | text | |

### `volunteer_application_roles`
Role preferences selected by applicant.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| application_id | uuid FK | CASCADE delete |
| role_id | uuid FK | |

### `volunteer_application_availability`
Availability slots indicated by applicant.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| application_id | uuid FK | CASCADE delete |
| available_date | date | |
| start_time | time | Nullable (full day if null) |
| end_time | time | Nullable |

### `volunteer_role_assignments`
Actual role assignments after acceptance.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| application_id | uuid FK | CASCADE delete |
| role_id | uuid FK | |
| assigned_at | timestamptz | |

### `volunteer_invitations`
Email invitations sent to prospective volunteers.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| event_id | uuid FK | |
| email | text | |
| name | text | Nullable |
| status | text | `sent`, `opened`, `applied` |
| sent_at | timestamptz | |
| created_at | timestamptz | |

## Feature Module

Path: `apps/web/src/features/volunteers/`

### Server Actions (`actions.ts`)
- **Settings:** `updateVolunteerSettings()`, `uploadBannerImage()`
- **Roles:** `createRole()`, `updateRole()`, `deleteRole()`
- **Questions:** `createQuestion()`, `updateQuestion()`, `deleteQuestion()`, `reorderQuestions()`
- **Applications:** `updateApplicationStatus()` (accept/reject with email notification), `bulkUpdateStatus()`, `addOrganizerNotes()`
- **Role assignments:** `assignRole()`, `unassignRole()`
- **Invitations:** `sendInvitations()` (batch), `sendReminders()`, `importContactsCsv()`
- **Public:** `submitApplication()` — public form submission, triggers auto-accept if enabled

### Queries (`queries.ts`)
- `getVolunteerSettings(eventId)`
- `getVolunteerRoles(eventId)`
- `getVolunteerQuestions(eventId)`
- `getApplications(eventId, filters?)` — status/role/search filtering
- `getApplication(applicationId)` — single application detail with answers, roles, availability
- `getVolunteerBreakdown(eventId)` — counts by role and status
- `getInvitations(eventId)` — sent invitations with status
- `getPublicVolunteerInfo(eventId)` — public form data (settings + roles + questions + event dates)

### RLS Policies
- **Organizer/admin:** Full CRUD on all volunteer tables (via `is_org_member` or `has_event_access`)
- **Public/anonymous:** INSERT on applications + related tables (form submission), SELECT on settings + roles + questions (render form)
- **Applicants:** SELECT their own application by `user_id` or `email`

## Organizer UI

### Volunteer Manager Page (`/events/{eventId}/volunteers`)

Three tabs:

#### Tab 1: Setup
- Application portal settings: title, instructions (textarea), banner image upload, deadline (date picker), auto-accept toggle, auto-add-to-attendees toggle
- Roles manager: table with add/edit/delete. Built-in roles (Session Moderator, Community Moderator, Check-in Staff) pre-seeded, toggleable. Custom roles created by organizer. Each has name, description, max volunteers.
- Custom questions: drag-to-reorder list with add/edit/delete. Each has question text + required toggle.
- Publish toggle with shareable link displayed when published.

#### Tab 2: Applications
- Stats bar: total, pending, accepted, rejected counts
- Filters: search by name/email, filter by status, filter by role preference
- Applications table: name, email, organization, role preferences, availability summary, status badge, date applied
- Row actions: view details, accept, reject
- Bulk actions: select multiple → bulk accept/reject
- Application detail slide-over: full application with answers, role preferences, availability grid, organizer notes, accept/reject buttons, role assignment after acceptance

#### Tab 3: Invitations
- Send invitations: email input (manual add or CSV upload), optional message, send button
- Invitation list: table with email, name, status (sent/opened/applied), sent date
- Send reminders: button to resend to non-applicants
- Shareable link: copy-to-clipboard URL

### Consent Forms Page (`/events/{eventId}/volunteers/consent-forms`)
Keep as Coming Soon — separate feature scope.

## Public Application Form

**Route:** `/{orgSlug}/{eventSlug}/volunteer`

### Layout
- Event branding header (name, dates, logo)
- Banner image (if configured)
- Title and instructions
- Deadline notice ("Applications close on X")

### Form Sections
1. **Personal Info** — Name (required), email (required), phone (optional), organization (optional)
2. **Role Preferences** — Checkboxes for available roles with descriptions and remaining spots
3. **Availability** — Grid of event dates with optional time slots (derived from event start/end dates)
4. **Custom Questions** — Dynamically rendered from organizer config
5. **Submit**

### Behaviors
- Pre-fill name/email if logged in
- Show "Applications are closed" if deadline passed
- 404 if not published
- Confirmation page after submission
- Prevent duplicate applications by email (unique constraint)
- No auth required

### Notification Emails
- **Application received** → organizer: "New volunteer application from {name}"
- **Accepted** → applicant: "You've been accepted as a volunteer!" with role details
- **Rejected** → applicant: "Thank you for your interest" (gentle decline)
- **Invitation** → prospect: "You're invited to volunteer at {event}" with application link
- **Reminder** → non-applicants: "Reminder: Applications close on {date}"

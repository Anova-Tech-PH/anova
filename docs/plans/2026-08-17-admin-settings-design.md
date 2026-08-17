# Per-Event Admin Settings — Design

## Goal

Add a Whova-style Admin Settings page under the Attendees section of the organizer dashboard, with 4 sections: invitation code, per-event admin management, check-in staff, and cross-org template sharing.

## Data Model

### Column additions to `events` table

| Column | Type | Notes |
|--------|------|-------|
| invitation_code | text | Nullable, single code per event |
| invitation_code_required | boolean | Default false |

### New table: `event_admins`

Per-event admin and check-in staff in one table.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| event_id | uuid FK → events | |
| email | text | Invited email |
| user_id | uuid FK → auth.users | Nullable — filled when user signs up/accepts |
| role | text | `admin` or `check_in` |
| added_by | uuid FK → auth.users | Who invited them |
| created_at | timestamptz | |
| UNIQUE(event_id, email) | | |

### New table: `shared_templates`

Cross-org template sharing.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| source_event_id | uuid FK → events | Event being shared from |
| shared_by | uuid FK → auth.users | |
| shared_with_email | text | Individual email, nullable |
| shared_with_org_id | uuid FK → organizations | Org share, nullable |
| status | text | `pending`, `accepted`, `declined` |
| created_at | timestamptz | |

### New table: `template_requests`

Request templates from another event.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| requesting_event_id | uuid FK → events | The new event wanting templates |
| requested_by | uuid FK → auth.users | |
| target_event_id | uuid FK → events | The event to clone from |
| message | text | Optional message to the organizer |
| status | text | `pending`, `approved`, `declined` |
| created_at | timestamptz | |

## Page Structure

Single scrollable page at `/events/[eventId]/admin-settings`, added under the Attendees group in the event sidebar.

### Section 1: Invitation Code

- Description text explaining purpose (privacy gate for attendees joining the event app)
- Text input for the code + "Set Code" button
- Checkbox: "Require invitation code to join this event"
- Warning note about not posting code on social media

### Section 2: Event Admins

- Table: Name, Email, Role, Added by, Actions (Edit | Remove)
- Shield icon for org-level admins (shown read-only, can't be removed from here)
- "Add Admin" button → dialog with email input + role dropdown
- "Share event templates" button (links to Section 4)

### Section 3: Check-in Staff

- Separate visual section, same underlying `event_admins` table filtered to `role = 'check_in'`
- Description: "Can only access check-in on the app, no other admin tools"
- "Add Check-in Staff" button → same dialog, role pre-set to `check_in`

### Section 4: Share Event Templates & Settings

**Share with others:**
- "Share with an individual" button → dialog with email input
- "Share with an organization" button → dialog with org name/email search
- System sends notification/email; recipient can clone into their event

**Request from another event:**
- "Request templates" button → dialog to enter email of past organizer + optional message
- Request appears in target organizer's Admin Settings as pending
- Target approves → requester can clone settings

**Incoming requests:**
- List of pending requests with Approve/Decline buttons (only shown if any exist)

### What gets cloned

- Agenda structure (sessions, tracks)
- Logistics items
- Ticket types (without pricing)
- Custom registration fields
- Sponsor categories
- Event settings

### What does NOT get cloned

- Attendee lists, registrations, orders
- Photos, announcements, poll results
- Any user-generated content

## Access Control

- Org-level admins/owners: full access, shown as permanent admins (can't be removed from this page)
- Per-event admins: full access to all 4 sections equally (add/remove admins, set code, manage templates)
- Per-event check-in staff: no access to this page
- All admins (org-level or per-event) have equal control — no permission tiers within the page

### Event access elsewhere in the app

- Per-event `admin` → full organizer dashboard for that event
- Per-event `check_in` → only check-in page for that event
- New function `has_event_access(event_id, min_role)` checks org membership OR event_admins table
- RLS policies on `event_admins`: admins can manage, check-in staff can view own row

## Sidebar Change

Add to layout.tsx Attendees group (after Badges):

```
{ href: `/events/${eventId}/admin-settings`, label: "Admin Settings", icon: "shield" }
```

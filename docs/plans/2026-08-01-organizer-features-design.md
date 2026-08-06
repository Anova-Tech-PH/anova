# Organizer Features — Design Document

## Features (in implementation order)

### Phase A: Must-Haves
1. **CSV Export** — Export registrations, check-ins, attendee data as CSV
2. **Event Duplication** — Clone an existing event with one click
3. **Custom Registration Fields** — Organizer-defined questions beyond name/email
4. **Discount/Promo Codes** — Percentage or flat discount with usage limits and expiry

### Phase B: High-Value
5. **Co-hosts / Team Roles** — Invite others to manage events (admin, check-in only, viewer)
6. **Post-Event Survey** — Auto-send feedback form after event ends
7. **Approval Workflow** — Organizer approves/rejects registrations

### Phase C: Nice-to-Haves
8. **Event Templates** — Save and reuse event configurations
9. **Attendee Certificate Generation** — PDF download with attendee name/event
10. **Revenue Dashboard** — Ticket sales over time, revenue by type

---

## Feature 1: CSV Export

### Problem
Organizers cannot export their attendee/registration data. Every major competitor (Eventbrite, Luma, Splash, Hopin) offers this as a baseline feature.

### Design

**What can be exported:**
- Registrations list (name, email, ticket type, status, registration date, check-in status)
- Check-in log (name, check-in time)

**Where it lives:**
- Export button on the Registrations tab (`/events/[eventId]/registrations`)
- Secondary export on Check-in tab

**Implementation approach:**
- Client-side CSV generation (no server route needed)
- Fetch all registrations via existing query, convert to CSV in browser
- Use `Blob` + `URL.createObjectURL` for download
- File named: `{event-title}-registrations-{date}.csv`

**Columns for registrations export:**
| Column | Source |
|--------|--------|
| Name | registrations.attendee_name |
| Email | registrations.attendee_email |
| Ticket Type | ticket_types.name (joined) |
| Status | registrations.status |
| Registered At | registrations.created_at |
| Checked In | registrations.checked_in_at (yes/no + timestamp) |

### Files to modify
- `src/features/registration/components/registrations-table.tsx` — add export button
- New: `src/features/registration/utils/export-csv.ts` — CSV generation utility

# Email & Communications Feature Design

## Overview

Add email capabilities to Attendly so organizers can send automated transactional emails (registration confirmation, event reminders, post-event thank you) and manual broadcast emails with audience segmentation.

## Decisions

- **Email provider:** Resend (React Email templates, generous free tier)
- **Architecture:** Direct Resend SDK integration in Next.js server actions
- **Scheduled emails:** Vercel Cron (hourly) for reminders and post-event triggers
- **Segmentation:** Filter by ticket type, registration status, check-in state (combinable)

## Database Schema

### email_templates

Reusable email templates per organization.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| organization_id | UUID FK | references organizations |
| name | TEXT | e.g., "Registration Confirmation" |
| subject | TEXT | supports {{variable}} placeholders |
| body_html | TEXT | HTML with {{variable}} placeholders |
| type | TEXT | 'transactional' or 'marketing' |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### email_logs

Record of every email sent.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| organization_id | UUID FK | references organizations |
| event_id | UUID FK | references events |
| template_id | UUID FK (nullable) | references email_templates |
| recipient_email | TEXT | |
| recipient_name | TEXT | |
| subject | TEXT | rendered subject |
| status | TEXT | queued, sent, delivered, failed, bounced |
| resend_id | TEXT | Resend message ID for tracking |
| sent_at | TIMESTAMPTZ | |
| error | TEXT | error message if failed |
| created_at | TIMESTAMPTZ | |

### email_automations

Rules for automated emails per event.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| event_id | UUID FK | references events |
| trigger | TEXT | on_registration, pre_event_24h, pre_event_1h, post_event |
| template_id | UUID FK | references email_templates |
| enabled | BOOLEAN | default true |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### registrations table modification

Add `unsubscribed BOOLEAN DEFAULT false` column for marketing email opt-out.

## Data Flow

### Automated Emails

1. **On registration:** Server action creates registration, checks for `on_registration` automation, sends confirmation email via Resend, logs to email_logs.
2. **Pre-event reminders:** Vercel Cron runs hourly, queries email_automations for `pre_event_24h` and `pre_event_1h` triggers, matches against events starting within that window, sends to all confirmed registrations, logs each send. Idempotent — checks email_logs before sending duplicates.
3. **Post-event:** Cron detects events that ended, sends thank-you emails to checked-in attendees.

### Manual Broadcast Emails

1. Organizer navigates to `/events/{eventId}/emails`
2. Composes email (subject + body) or selects a template
3. Selects audience segment (filters: ticket type, status, check-in state)
4. Previews email with recipient count
5. Confirms send
6. Server action fetches matching registrations, sends via Resend batch API (100 per batch), logs all sends

## Segmentation

Filters are combinable:

- **Ticket type:** Select one or more ticket types
- **Registration status:** pending, confirmed, cancelled, checked_in
- **Check-in state:** checked in / not checked in

Query builder constructs Supabase query dynamically based on selected filters.

## File Structure

```
/features/emails/
  actions.ts              - sendEmail, sendBroadcast, createTemplate,
                            updateTemplate, deleteTemplate,
                            createAutomation, toggleAutomation
  queries.ts              - getEmailLogs, getTemplates, getAutomations,
                            getSegmentedRecipients
  lib/
    resend.ts             - Resend client singleton
    templates/
      registration-confirmation.tsx  - React Email component
      event-reminder.tsx             - React Email component
      post-event.tsx                 - React Email component
    segments.ts           - Segmentation query builder
  components/
    email-dashboard.tsx   - Overview with logs and stats
    compose-email.tsx     - Broadcast composer with segment picker
    template-editor.tsx   - Create/edit templates
    automation-list.tsx   - Manage automated email rules
    email-log-table.tsx   - Sent email history with status

/app/(organizer)/events/[eventId]/emails/
  page.tsx                - Emails tab in event management

/app/api/cron/email-reminders/
  route.ts                - Vercel Cron endpoint for scheduled emails
```

## Variable Substitution

Supported variables in templates:

- `{{attendee_name}}` — Registrant's full name
- `{{event_name}}` — Event title
- `{{event_date}}` — Formatted start date
- `{{event_url}}` — Public event page URL
- `{{ticket_type}}` — Name of the ticket type
- `{{unsubscribe_url}}` — Opt-out link (required for marketing emails)

## Key Behaviors

- **Default templates:** Seed 3 default templates on event creation (confirmation, reminder, thank-you)
- **Batch sending:** Resend batch API for 100+ recipients, loop for larger lists
- **Rate limiting:** Respect Resend free tier (100/day). Show organizer remaining quota before sending
- **Unsubscribe:** Marketing emails include unsubscribe link. Respects `unsubscribed` flag on registrations
- **Idempotent cron:** Check email_logs before sending scheduled emails to prevent duplicates

## Error Handling

- Resend API failure: log error, mark as `failed`, toast to organizer
- Invalid recipient: skip, log as `bounced`
- Cron failure: idempotent design prevents duplicate sends on retry
- Template render failure: fallback to plain text

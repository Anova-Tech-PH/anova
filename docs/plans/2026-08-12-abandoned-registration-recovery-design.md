# Abandoned Registration Recovery Design

## Goal

Automatically detect incomplete registrations and send recovery emails to bring users back to complete their registration. Follows Whova's fully automatic approach.

## Architecture

### Approach: Intent tracking + cron-based recovery emails

When a user enters their email in the registration form but doesn't complete, we save a `registration_intent`. A cron job checks for unconverted intents and sends recovery emails after a configurable delay.

### New Table: `registration_intents`

```sql
CREATE TABLE public.registration_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  ticket_type_id UUID NOT NULL REFERENCES public.ticket_types(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  custom_fields JSONB DEFAULT '{}',
  promo_code_id UUID REFERENCES public.promo_codes(id) ON DELETE SET NULL,
  converted_registration_id UUID REFERENCES public.registrations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'converted', 'expired')),
  recovery_emails_sent INT NOT NULL DEFAULT 0,
  last_recovery_email_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, email)
);
```

- Upsert by `(event_id, email)` to avoid duplicates
- `converted` when `registerForEvent()` succeeds
- `expired` when user unsubscribes or event ends

### Event-level recovery settings

Add columns to `events` table (no new table):

- `recovery_enabled BOOLEAN NOT NULL DEFAULT false`
- `recovery_delay_hours INT NOT NULL DEFAULT 1`
- `recovery_email_count INT NOT NULL DEFAULT 2` (max 1-3)

### Data Flow

```
User enters email in RegistrationFlow
  -> trackRegistrationIntent() server action (upsert)
  -> registration_intents row created

User completes registration
  -> registerForEvent() marks intent as 'converted'

Cron runs hourly (/api/cron/registration-recovery)
  -> Finds 'pending' intents where created_at + delay < now
  -> Checks recovery_emails_sent < recovery_email_count
  -> Respects spacing: 1st at delay, 2nd at +24h, 3rd at +72h
  -> Sends recovery email via Resend
  -> Logs to email_logs
  -> Increments recovery_emails_sent on intent

User clicks recovery link
  -> /org/event/register?intent={id}
  -> Pre-fills ticket, name, email
```

## Client-Side Tracking

Modify `RegistrationFlow` to call `trackRegistrationIntent()` on email blur when:
- Email field has a valid email
- A ticket is selected

Debounced, fires once per unique email value. Minimal UX impact.

## Recovery Email Template

- Subject: "Complete your registration for {event}"
- Body: Event summary (name, date, venue), selected ticket info, "Complete Registration" CTA button
- CTA links to `/org/event/register?intent={id}`
- Unsubscribe link marks intent as `expired`
- "Powered by Attendly" footer

## Organizer UI

Add "Recovery Emails" section to the existing Marketing tab (`/events/[eventId]/marketing/`):

- Toggle: enable/disable recovery
- Delay selector: 30min, 1h, 2h, 4h, 24h
- Email count: 1, 2, or 3
- Stats card: intents captured, emails sent, conversions (converted/total intents)

## Intent Pre-fill

When registration page receives `?intent={id}`:
1. Fetch intent by ID
2. Pre-fill ticket selection, name, email in `RegistrationFlow`
3. User just needs to confirm and submit

## Security

- `registration_intents` allows anon INSERT (public registration pages)
- SELECT restricted to org members (organizer dashboard)
- Recovery cron uses service role key (same pattern as email-reminders)
- Intent IDs are UUIDs (unguessable)
- Only published events with `recovery_enabled = true` are processed
- Unsubscribe link expires the intent permanently

## Tech Stack

- New migration for `registration_intents` table + `events` columns
- New server action: `trackRegistrationIntent()`
- Modify existing: `registerForEvent()` to mark intents as converted
- New cron route: `/api/cron/registration-recovery/route.ts`
- New react-email template: `recovery-email.tsx`
- Modify: `RegistrationFlow` component (add intent tracking)
- Modify: Marketing page (add recovery settings section)

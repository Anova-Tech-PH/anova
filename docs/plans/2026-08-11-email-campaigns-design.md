# Email Campaigns Design — Whova-Style

## Overview

Extend Attendly's existing email feature with full campaign management: contact list imports, rich email composer with live preview, campaign tracking, and unsubscribe handling. Modeled after Whova's Email Campaign workflow.

## What Already Exists

- Resend integration with singleton client
- Broadcast compose modal with segment filters (ticket type, status)
- Registration confirmation email (React Email template)
- Event reminder + post-event templates
- Cron endpoint for scheduled emails (pre-event 24h/1h, post-event)
- Automation list with toggle/delete (no create UI)
- Email dashboard with stats + email log table
- Variable substitution (`{{attendee_name}}`, `{{event_name}}`)
- DB tables: `email_templates`, `email_logs`, `email_automations`

## New Database Schema

### contact_lists

Named recipient lists per organization (for marketing to non-registrants).

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | default gen_random_uuid() |
| organization_id | UUID FK | references organizations |
| name | TEXT NOT NULL | e.g. "2025 Attendees", "Newsletter List" |
| created_at | TIMESTAMPTZ | default now() |

### contacts

Individual contacts within a list.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | default gen_random_uuid() |
| contact_list_id | UUID FK | references contact_lists ON DELETE CASCADE |
| email | TEXT NOT NULL | |
| first_name | TEXT | |
| last_name | TEXT | |
| unsubscribed | BOOLEAN | default false |
| created_at | TIMESTAMPTZ | default now() |

Unique constraint on (contact_list_id, email) to prevent duplicates.

### email_campaigns

Each campaign is a composed email sent to a specific audience.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | default gen_random_uuid() |
| event_id | UUID FK | references events |
| subject | TEXT NOT NULL | supports {{variable}} placeholders |
| body_html | TEXT NOT NULL | rich text content |
| sender_name | TEXT | |
| reply_to | TEXT | |
| recipient_source | TEXT NOT NULL | 'contact_list' or 'registrants' |
| contact_list_id | UUID FK nullable | references contact_lists |
| segment_filters | JSONB nullable | {ticket_type_ids, statuses, checked_in} |
| include_cta | BOOLEAN | default true, show Register button |
| status | TEXT NOT NULL | 'draft', 'sending', 'sent' |
| sent_count | INT | default 0 |
| failed_count | INT | default 0 |
| sent_at | TIMESTAMPTZ nullable | |
| created_at | TIMESTAMPTZ | default now() |
| updated_at | TIMESTAMPTZ | default now() |

### email_logs modification

Add `campaign_id UUID FK nullable` referencing `email_campaigns`.

## RLS Policies

All new tables use `is_org_member()` check:
- `contact_lists`: org members can CRUD on their org's lists
- `contacts`: org members can CRUD via join to contact_lists
- `email_campaigns`: org members can CRUD via join to events → organizations

## Contact List Management

- Create named lists per organization
- CSV upload: parse columns (email, first_name, last_name), skip duplicates
- Manual add: single contact form
- Delete list (cascades contacts)
- "Reuse past list": copy a list from another event's campaigns (same org)

## Campaign Composer

Full-page form (not modal) with:

1. **Recipient source** — radio toggle:
   - "Contact List": dropdown to select list, shows contact count
   - "Registered Attendees": existing segment filters (ticket type, status, check-in)

2. **Sender info** — sender name, reply-to email

3. **Email content** — subject line + rich text body
   - Variable substitution: `{{first_name}}`, `{{event_name}}`, `{{event_date}}`, `{{event_url}}`
   - "Reuse past email" button: pick from previously sent campaigns

4. **Registration CTA** — toggle to include/exclude Register button linking to public event page

5. **Email preview** — live rendered preview showing:
   - Event header (event name, dates, location)
   - Body content with variables resolved to sample values
   - Register CTA button
   - Unsubscribe link

6. **Actions**:
   - "Send test email" — sends to organizer's own email
   - "Save draft" — saves campaign with status 'draft'
   - "Send" — confirmation dialog with recipient count, then send

## Send Flow

1. Campaign status → 'sending'
2. Fetch recipients (from contact list or segmented registrations)
3. Render email using React Email template (campaign-email.tsx):
   - Header: event name, dates, location
   - Body: variable-substituted rich text
   - Footer: Register CTA (optional) + unsubscribe link (required for contact list)
4. Send in batches of 50 via Resend, log each to email_logs with campaign_id
5. Update campaign: status → 'sent', sent_count, failed_count, sent_at

## Unsubscribe

- Generate signed JWT token containing: email + contact_list_id (or registration_id)
- API route `GET /api/unsubscribe/[token]`:
  - Verify JWT
  - Set `unsubscribed = true` on contact or registration
  - Return simple HTML confirmation page
- Unsubscribe link included in all marketing emails (contact list recipients)
- Existing `unsubscribed` field on registrations already filtered in segment queries

## Emails Tab Restructure

Three sections on the page:

1. **Campaigns** — table of draft/sent campaigns + "Create Campaign" button
   - Columns: subject, audience, status, sent count, date
   - Click to view/edit

2. **Automations** — existing list + new "Create Automation" button
   - Form: trigger type dropdown, template selection, enable toggle

3. **Email Log** — existing table, now filterable by campaign

## File Structure

```
features/emails/
  actions.ts              — add: createCampaign, updateCampaign, sendCampaign,
                              sendTestEmail, createContactList, uploadContacts,
                              deleteContactList, createAutomation (UI)
  queries.ts              — add: getCampaigns, getCampaignById,
                              getContactLists, getContactsByList
  lib/
    segments.ts           — unchanged
    unsubscribe.ts        — NEW: generate/verify unsubscribe tokens
    campaign-email.tsx    — NEW: React Email template for campaigns
  components/
    campaign-list.tsx     — NEW: table of campaigns with status/stats
    campaign-composer.tsx — NEW: full-page campaign form
    campaign-preview.tsx  — NEW: live email preview
    contact-lists.tsx     — NEW: manage contact lists + CSV upload
    create-automation.tsx — NEW: form to create automation rules

app/(organizer)/events/[eventId]/emails/
  page.tsx                — restructured: campaigns + automations + logs
  campaigns/new/page.tsx  — NEW: create campaign page
  campaigns/[id]/page.tsx — NEW: edit/view campaign

app/api/unsubscribe/[token]/
  route.ts                — NEW: unsubscribe endpoint
```

## Migration

`031_email_campaigns.sql`:
- CREATE TABLE contact_lists
- CREATE TABLE contacts (with unique constraint)
- CREATE TABLE email_campaigns
- ALTER TABLE email_logs ADD COLUMN campaign_id
- RLS policies for all new tables
- Grants for authenticated role

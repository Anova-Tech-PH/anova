# UX Evaluation Report: Wording Sync — Question Forms & Confirmation Emails

**Date:** 2026-08-17
**Tested by:** Claude (Playwright MCP)
**Page(s) tested:**
- `/events/[eventId]/custom-fields` (Question Forms)
- `/events/[eventId]/confirmation-emails` (Confirmation Emails)
- `/events/[eventId]/promo-codes` (Discount Codes)
- `/events/[eventId]/group-tickets` (Group Tickets)

## Summary

Wording and terminology across all Ticket Setup pages have been aligned with Whova's organizer dashboard. All 12 sidebar navigation items render correctly (200 status, no console errors). A build error caused by a `Link` name collision in `event-sub-sidebar.tsx` was found and fixed during testing.

## Functional Test Results

| Test | Result |
|------|--------|
| All 12 nav items visible in sidebar | PASS |
| All tested routes return 200 | PASS |
| No console errors on any page | PASS |
| Question Forms — page title matches nav label | PASS |
| Question Forms — empty state uses "questions" not "fields" | PASS |
| Question Forms — "Add Question" button label | PASS |
| Confirmation Emails — updated subtitle | PASS |
| Confirmation Emails — "Email subject" label with char counter | PASS |
| Confirmation Emails — "Custom message" label | PASS |
| Confirmation Emails — form opens/closes | PASS |
| Confirmation Emails — empty state updated | PASS |
| Discount Codes — page title matches nav label | PASS |
| Group Tickets — page loads | PASS |

## Critical Issues (fix before release)

| # | Heuristic | Issue | Recommendation | Severity |
|---|-----------|-------|----------------|----------|
| 1 | Error Prevention | `Link` icon from lucide-react collided with Next.js `Link` import in `event-sub-sidebar.tsx`, causing 500 error on all event pages | Fixed: renamed to `LinkIcon` in import and `iconMap` | Critical (FIXED) |

## Major Issues (fix soon)

None found.

## Minor Issues (nice to have)

| # | Heuristic | Issue | Recommendation | Severity |
|---|-----------|-------|----------------|----------|
| 1 | Consistency | Promo codes page uses "promo codes" in empty state but nav/title says "Discount Codes" | Change empty state text from "promo codes" to "discount codes" | Minor |

## What's Working Well

- All terminology now aligned with Whova across nav labels, page titles, and UI elements
- Question Forms: title, subtitle, empty state, form headings, buttons, and toasts all use "question" consistently
- Confirmation Emails: subtitle matches Whova's descriptive tone, subject field has character counter (100 max), body label says "Custom message"
- Discount Codes: page title matches nav label
- Group Tickets: sales date range now shown on cards
- All 12 sidebar items render and navigate correctly

## Changes Made This Session

### Question Forms (`custom-fields/page.tsx` + `custom-fields-manager.tsx`)
- Page title: "Registration Form Fields" -> "Question Forms"
- Subtitle: -> "Customize the questions attendees answer when registering for your event."
- Empty state: "No custom fields yet. Add fields..." -> "No questions yet. Add questions..."
- Form heading: "Add New Field"/"Edit Field" -> "Add New Question"/"Edit Question"
- Buttons: "Add Field"/"Update Field" -> "Add Question"/"Update Question"
- All toasts: "Field added/updated/deleted" -> "Question added/updated/deleted"

### Confirmation Emails (`confirmation-emails/page.tsx` + `email-template-manager.tsx`)
- Subtitle: -> "Attendees receive a confirmation email once they register for your event. Customize the content and settings for those emails here."
- Empty state: "No email templates yet." -> "No confirmation emails yet."
- Subject label: "Subject *" -> "Email subject *" with 0/100 character counter
- Body label: "Body *" -> "Custom message *"
- Subject placeholder: -> "Your tickets for {{event_name}}"

### Bug Fix (`event-sub-sidebar.tsx`)
- Renamed `Link` lucide icon import to `LinkIcon` to avoid collision with Next.js `Link`

### Group Tickets (`group-ticket-list.tsx`)
- Added sales date range display ("On sale: Aug 1 - Sep 14") with CalendarDays icon

## Recommended Next Steps

1. Fix Minor #1: Change "promo codes" to "discount codes" in promo-codes empty state text
2. Consider adding rich text editor to Confirmation Emails (Whova uses TinyMCE)
3. Consider adding Preview button for confirmation emails
4. Consider adding default/preset fields to Question Forms (Name, Email, Phone, etc.)

# UX Evaluation Report: Ticket Setup Navigation & Group Tickets

**Date:** 2026-08-17
**Tested by:** Claude (Playwright MCP)
**Page(s) tested:**
- `/events/[eventId]/tickets` (Create Tickets)
- `/events/[eventId]/group-tickets` (Group Tickets — new)
- `/events/[eventId]/custom-fields` (Question Forms)
- `/events/[eventId]/confirmation-emails` (Confirmation Emails)
- `/events/[eventId]/ticket-addons` (Ticket Add-ons)
- `/events/[eventId]/promo-codes` (Discount Codes)
- `/events/[eventId]/member-tickets` (Member & Invite-Only — new, Coming Soon)
- `/events/[eventId]/rsvp` (Session RSVP)
- `/events/[eventId]/registration-pages` (Registration Pages)
- `/events/[eventId]/registration-widgets` (Registration Widgets)
- `/events/[eventId]/abandoned-registration` (Abandoned Registration — new, Coming Soon)
- `/events/[eventId]/registration-settings` (Registration Settings)

## Summary

All 12 Ticket Setup sidebar navigation items render correctly and route to working pages (200 status, no errors). The new Group Tickets page supports full CRUD with proper form validation, confirmation dialogs for delete, and optimistic UI updates. Two new Coming Soon placeholder pages (Member & Invite-Only, Abandoned Registration) render cleanly.

## Functional Test Results

| Test | Result |
|------|--------|
| All 12 nav items visible in sidebar | PASS |
| All 12 routes return 200 | PASS |
| No console errors on any page | PASS |
| Group ticket create form opens | PASS |
| Group ticket form validates required fields | PASS |
| Group ticket form char counter (name 50, desc 200) | PASS |
| Group ticket creates successfully | PASS |
| Toast notification on create | PASS |
| Group ticket card shows $price/person badge | PASS |
| Group ticket card shows min/max ticket badges | PASS |
| Group ticket card shows sold/available counts | PASS |
| Group ticket edit pre-fills all values | PASS |
| Group ticket edit saves changes | PASS |
| Group ticket delete shows confirmation dialog | PASS |
| Cancel on delete dialog preserves ticket | PASS |
| Coming Soon pages render (Member, Abandoned) | PASS |
| Empty state shows on Group Tickets with no data | PASS |

## Critical Issues (fix before release)

None found.

## Major Issues (fix soon)

| # | Heuristic | Issue | Recommendation | Severity |
|---|-----------|-------|----------------|----------|
| 1 | Consistency | Nav label "Discount Codes" doesn't match page title "Promo Codes" | Align terminology — either both "Discount Codes" or both "Promo Codes" | Major |

## Minor Issues (nice to have)

| # | Heuristic | Issue | Recommendation | Severity |
|---|-----------|-------|----------------|----------|
| 1 | Visibility | No active/selected state highlight on sidebar nav items | Highlight current page in sidebar sub-nav | Minor |
| 2 | Information | Group ticket card doesn't show sales date window | Add "On sale: Aug 1 - Sep 14" to card | Minor |
| 3 | Consistency | Coming Soon pages have duplicate heading (page header + ComingSoon component) | Remove the outer header when using ComingSoon component, or use page-level header only | Minor |

## What's Working Well

- Clean, consistent card design for group tickets with informative badges
- Form validation prevents submission without required fields
- Character counters on name (50) and description (200) match Whova's limits
- Price shown as "per attendee" with clear note, avoiding confusion
- Delete confirmation dialog prevents accidental data loss
- Empty state includes description and CTA button
- All pages load instantly with no console errors

## Recommended Next Steps

1. Align "Discount Codes" / "Promo Codes" terminology across nav and page
2. Add active state styling to sidebar sub-nav items
3. Fix duplicate heading on Coming Soon pages
4. Consider adding sales date range to group ticket cards

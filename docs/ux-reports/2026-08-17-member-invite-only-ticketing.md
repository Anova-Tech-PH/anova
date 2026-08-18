# UX Evaluation Report: Member & Invite-Only Ticketing

**Date:** 2026-08-17
**Tested by:** Claude (Playwright MCP)
**Page(s) tested:**
- `/events/[eventId]/member-tickets` (Member & Invite-Only Ticketing)
- Whova comparison: `https://whova.com/xems/view/ticket_restriction/globa_202509/`

## Summary

Member & Invite-Only Ticketing page replaces the ComingSoon placeholder with a fully functional ticket restriction system. All 4 restriction methods from Whova are implemented (email list, org domain, domain type, membership). The ticket table, "Add restrictions" dropdown, and inline badge display all match Whova's UI pattern. All CRUD operations work correctly with 0 console errors.

## Functional Test Results

| Test | Result |
|------|--------|
| Page loads without errors (0 console errors) | PASS |
| Page title and subtitle match Whova wording | PASS |
| Info banner shows "4 ways to add restrictions" | PASS |
| Ticket table displays with columns: name, price, restricted to | PASS |
| "No restrictions" shown for unrestricted tickets | PASS |
| "Add restrictions" dropdown button on each ticket row | PASS |
| Dropdown shows all 4 restriction types with icons | PASS |
| Dropdown shows badge count for existing restrictions | PASS |
| Create email list restriction (enter emails, save) | PASS |
| Create org domain restriction (enter domains, save) | PASS |
| Multiple restriction badges display side by side | PASS |
| Badge shows icon + count (e.g., "3 emails", "2 orgs") | PASS |
| Click badge opens editor with pre-populated values (round-trip) | PASS |
| Entry counter updates in real time | PASS |
| X button on badge triggers confirmation dialog | PASS |
| Confirmation dialog shows restriction type name | PASS |
| Remove restriction updates table immediately | PASS |
| Cancel button closes editor without saving | PASS |
| X button closes editor without saving | PASS |
| Loading state on Save button during save | PASS |
| Data persists on page reload | PASS |
| Items count displays correctly ("Items 1-1 of 1") | PASS |

## Whova Wording Comparison

| Element | Whova | Attendly | Match |
|---------|-------|----------|-------|
| Page title | "Member & Invite-Only Ticketing" | "Member & Invite-Only Ticketing" | YES |
| Subtitle | "Restrict who can register based on specific emails, organizations, organization types, or membership levels..." | Same | YES |
| Info text | "4 ways to add restrictions" | "4 ways to add restrictions: invited email addresses, specific organizations, organization types, or membership levels." | YES |
| Table: col 1 | "Ticket name" | "Ticket name" | YES |
| Table: col 2 | "Price" | "Price" | YES |
| Table: col 3 | "Restricted to" | "Restricted to" | YES |
| No restrictions | "No restrictions" | "No restrictions" | YES |
| Dropdown button | "Add restrictions" | "Add restrictions" | YES |
| Method 1 | "Restrict to a list of invited email addresses" | "Restrict to a list of invited email addresses" | YES |
| Method 2 | "Restrict to specific organizations" | "Restrict to specific organizations" | YES |
| Method 3 | "Restrict to specific organization types" | "Restrict to specific organization types" | YES |
| Method 4 | "Restrict to membership levels and statuses" | "Restrict to membership levels and statuses" | YES |
| Pagination | "Items 1-1 of 1" | "Items 1-1 of 1" | YES |

## Critical Issues (fix before release)

None found.

## Major Issues (fix soon)

None found.

## Minor Issues (nice to have)

| # | Heuristic | Issue | Recommendation | Severity |
|---|-----------|-------|----------------|----------|
| 1 | Feature Gap | Whova has sortable columns (Ticket name, Price, Restricted to) | Consider adding column sort for events with many tickets | Minor |
| 2 | Feature Gap | Whova has pagination controls (first, prev, next, last) | Consider adding pagination for events with many tickets | Minor |
| 3 | Feature Gap | Whova has "Get started" button per restriction type linking to dedicated setup page | Current inline editor is simpler and works well | Minor |
| 4 | Feature Gap | Whova's membership method integrates with AMS systems (WildApricot, MemberClicks, etc.) | Consider future AMS integration for membership verification | Minor |
| 5 | Feature Gap | Whova supports CSV/spreadsheet upload for email lists | Consider adding CSV upload for bulk email import | Minor |

## What's Working Well

- All 4 restriction methods match Whova's terminology exactly
- Ticket table layout mirrors Whova's design (name, price, restricted to, add restrictions)
- Inline editor with textarea is intuitive for entering values
- Badge display with icons provides clear visual summary of active restrictions
- Click-to-edit on badges makes editing discoverable
- Confirmation dialog prevents accidental removal of restrictions
- Loading state on Save button provides feedback
- Real-time entry counter helps users track input
- Data persists correctly across page reloads

## Changes Made This Session

### Migration (`098_ticket_restrictions.sql`)
- Created `ticket_restrictions` table with id, ticket_type_id, restriction_type, values (text[])
- 4 restriction types: email_list, org_domain, domain_type, membership
- Unique constraint on (ticket_type_id, restriction_type)
- RLS policies following ticket visibility pattern
- Grants for authenticated and anon roles

### Feature Module (`src/features/ticket-restrictions/`)
- `queries.ts`: getRestrictionsByEvent query with inner join on ticket_types
- `actions.ts`: upsertRestriction, removeRestriction, removeAllRestrictions server actions
- `components/restriction-manager.tsx`: Full CRUD UI with ticket table, dropdown, editor, badges

### Page (`member-tickets/page.tsx`)
- Replaced ComingSoon placeholder with full implementation
- Parallel data fetching for tickets and restrictions
- Page title, subtitle, and info banner matching Whova wording

## Recommended Next Steps

1. Consider adding CSV/Excel upload for bulk email list import
2. Consider adding column sorting for events with many ticket types
3. Consider adding registration-side enforcement (check restrictions during registration)
4. Consider adding AMS integration for membership verification

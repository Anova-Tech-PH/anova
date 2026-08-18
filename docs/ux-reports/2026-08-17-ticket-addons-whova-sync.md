# UX Evaluation Report: Ticket Add-ons (Whova Sync)

**Date:** 2026-08-17
**Tested by:** Claude (Playwright MCP)
**Page(s) tested:**
- `/events/[eventId]/ticket-addons` (Ticket Add-ons)
- Whova comparison: `https://whova.com/xems/view/reg_additems/globa_202509/`

## Summary

Ticket Add-ons page has been synced with Whova's terminology and form structure. Two missing fields (Limit per order, Availability period) were added. All CRUD operations work correctly with no console errors. Form fields round-trip properly on edit.

## Functional Test Results

| Test | Result |
|------|--------|
| Page loads without errors (0 console errors) | PASS |
| Empty state displays with description and CTA | PASS |
| Create form opens with all fields | PASS |
| Add-on name: 50 char limit with counter | PASS |
| Description: textarea with 350 char counter | PASS |
| Availability: radio buttons with conditional datetime | PASS |
| Quantity field | PASS |
| Limit per order: dropdown 1-10 | PASS |
| Form submit creates add-on | PASS |
| Card displays all fields (name, price, qty, limit, tickets, date, description) | PASS |
| Edit populates all fields correctly (round-trip) | PASS |
| Delete shows confirmation dialog | PASS |
| Delete removes add-on and shows toast | PASS |
| Toast notifications appear for create/update/delete | PASS |
| Cancel discards form without saving | PASS |

## Whova Wording Comparison

| Element | Whova | Attendly (After Sync) | Match |
|---------|-------|----------------------|-------|
| Page title | "Ticket Add-ons" | "Ticket Add-ons" | YES |
| Subtitle | "Sell add-ons such as t-shirts and other merchandise..." | "Sell add-ons such as t-shirts, parking passes, and other extras..." | YES (close) |
| Form heading | "Create add-on" | "Create add-on" | YES |
| Name field | "Add-on name *" (0/50) | "Add-on name *" (0/50) | YES |
| Name placeholder | "e.g. T-shirt" | "e.g. T-shirt" | YES |
| Description | Textarea (0/350) | Textarea (0/350) | YES |
| Description placeholder | "Enter a description about this add-on" | "Enter a description about this add-on" | YES |
| Availability | Radio: "Until ticket sales end" / "Until a specific date and time" | Same radio options | YES |
| Quantity | "Quantity *" | "Quantity *" | YES |
| Limit per order | Dropdown 1-10 | Dropdown 1-10 | YES |
| Ticket scope | "Which tickets can purchase this add-on?" with All/Specific radio | Same with All/Specific radio | YES |
| Buttons | Cancel / Create | Cancel / Create | YES |

## Critical Issues (fix before release)

None found.

## Major Issues (fix soon)

None found.

## Minor Issues (nice to have)

| # | Heuristic | Issue | Recommendation | Severity |
|---|-----------|-------|----------------|----------|
| 1 | Consistency | Page subtitle differs slightly from Whova ("parking passes, and other extras" vs "and other merchandise") | Minor wording difference, acceptable for brand differentiation | Minor |
| 2 | Feature Gap | Whova has "Option: Provide multiple options (such as color, size, etc)" checkbox for variants | Consider adding in a future release | Minor |
| 3 | Feature Gap | Whova has "Additional questions (0/5)" for per-add-on custom questions | Consider adding in a future release | Minor |
| 4 | Feature Gap | Whova has "Reuse past add-on" template feature | Consider adding for multi-event organizers | Minor |

## What's Working Well

- All terminology now aligned with Whova across form labels, placeholders, and char counters
- New "Limit per order" dropdown matches Whova's 1-10 range with default of 10
- Availability period radio buttons match Whova's UX pattern exactly
- Description upgraded from single-line input to textarea with proper char counter
- "Which tickets can purchase this add-on?" uses All/Specific radio pattern like Whova
- Delete confirmation dialog prevents accidental deletions
- Loading state on submit button provides feedback during save
- Form close (X button and Cancel) both work correctly
- Empty state has clear description and CTA button

## Changes Made This Session

### Migration (`096_ticket_addon_enhancements.sql`)
- Added `limit_per_order INT DEFAULT 10` column
- Added `available_until TIMESTAMPTZ` column

### Backend (`ticket-addons/actions.ts`)
- Added `limit_per_order` and `available_until` to create/update signatures

### Type (`ticket-addons/queries.ts`)
- Added `limit_per_order` and `available_until` to `TicketAddon` type

### UI (`ticket-addons/components/addon-manager.tsx`)
- "Name *" -> "Add-on name *" with 50 char counter
- Description: Input -> Textarea with 350 char counter
- Added "Add-on details" section header
- Added availability period radio (until sales end / specific date)
- Added "Limit per order" dropdown (1-10)
- "Which tickets" section under "Advanced options" heading with All/Specific radio
- Button order: Cancel then Create/Update
- Empty state updated to Whova's fulfillment responsibility wording
- Card displays limit_per_order and available_until info

## Recommended Next Steps

1. Consider adding "Options" (color/size variants) for merchandise add-ons
2. Consider adding per-add-on custom questions (up to 5, like Whova)
3. Consider "Reuse past add-on" for multi-event organizers
4. Add drag-and-drop reordering for multiple add-ons

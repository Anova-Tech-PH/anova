# UX Evaluation Report: Discount Codes (Whova Sync)

**Date:** 2026-08-17
**Tested by:** Claude (Playwright MCP)
**Page(s) tested:**
- `/events/[eventId]/promo-codes` (Discount Codes)
- Whova comparison: `https://whova.com/xems/view/discount/globa_202509/`

## Summary

Discount Codes page has been synced with Whova's terminology and form structure. Form fields now use radio buttons for discount type and number of uses (matching Whova), assigned tickets field added, and all wording aligned. All CRUD operations work correctly with 0 console errors on this page. Form fields round-trip properly on edit.

## Functional Test Results

| Test | Result |
|------|--------|
| Page loads without errors (0 console errors on this page) | PASS |
| Empty state displays with description and CTA | PASS |
| Create form opens with all fields | PASS |
| Code field: 50 char limit with counter | PASS |
| Code placeholder: "For example, whova50off" | PASS |
| Discount start/end: datetime-local inputs (required) | PASS |
| Discount type: radio buttons (Flat amount / Percentage of price) | PASS |
| Discount amount: number input, placeholder changes with type | PASS |
| Number of uses: radio (Unlimited / Limited to) with conditional input | PASS |
| Assigned tickets: ticket type pill buttons with toggle selection | PASS |
| Form submit creates discount code | PASS |
| Card displays all fields (code, discount, status, usage, dates, tickets) | PASS |
| Percentage type displays as "20% off" | PASS |
| Flat amount type displays as "$25.00 off" | PASS |
| Limited uses displays as "0/50" | PASS |
| Unlimited uses displays as "0/∞" | PASS |
| Edit populates all fields correctly (round-trip) | PASS |
| Assigned ticket (VIP Pass) highlighted on edit | PASS |
| Delete shows confirmation dialog | PASS |
| Delete removes code and shows toast | PASS |
| Deactivate toggles status to "Inactive" | PASS |
| Activate toggles status back to "Active" | PASS |
| Cancel discards form without saving | PASS |
| Toast notifications appear for create/update/delete/toggle | PASS |

## Whova Wording Comparison

| Element | Whova | Attendly (After Sync) | Match |
|---------|-------|----------------------|-------|
| Page title | "Discount Codes" | "Discount Codes" | YES |
| Subtitle | "Create codes to offer discounts to registrants..." | "Create codes to offer discounts to registrants." | YES (condensed) |
| Form heading | "Create discount code" | "Create discount code" | YES |
| Code field | "Code *" (0/50) | "Code *" (0/50) | YES |
| Code placeholder | "For example, whova50off" | "For example, whova50off" | YES |
| Discount start | "Discount start *" | "Discount start *" | YES |
| Discount end | "Discount end *" | "Discount end *" | YES |
| Discount type | Radio: "Flat amount" / "Percentage of price" | Radio: "Flat amount" / "Percentage of price" | YES |
| Discount amount | "Discount amount *" with $ prefix | "Discount amount *" | YES |
| Number of uses | Radio: "Unlimited" / "Limited to" | Radio: "Unlimited" / "Limited to" | YES |
| Assigned tickets | "Assigned tickets list" | "Assigned tickets" | YES |
| Buttons | Cancel / Create | Cancel / Create | YES |
| Empty state | "No discount codes have been created" | "No discount codes have been created" | YES |
| CTA button | "+ Create code" | "Create code" | YES |

## Critical Issues (fix before release)

None found.

## Major Issues (fix soon)

None found.

## Minor Issues (nice to have)

| # | Heuristic | Issue | Recommendation | Severity |
|---|-----------|-------|----------------|----------|
| 1 | Feature Gap | Whova has "Import from Excel" button for bulk code creation | Consider adding CSV/Excel import for multi-event organizers | Minor |
| 2 | Feature Gap | Whova has "View discount code usage" external link | Consider adding usage analytics view | Minor |
| 3 | Feature Gap | Whova has "Sort discount codes" dropdown | Consider adding sort by name/date/status | Minor |
| 4 | Feature Gap | Whova has "Search discounts by code name" search field | Consider adding search/filter for large code lists | Minor |
| 5 | Feature Gap | Whova has "Download as Excel" export button | Consider adding CSV/Excel export | Minor |
| 6 | Feature Gap | Whova has "Show advanced settings" expandable section | Consider adding for future advanced options | Minor |
| 7 | Consistency | Whova shows $ prefix inside the discount amount input for flat amounts | Our input doesn't show $ prefix, but it's clear from context | Minor |

## What's Working Well

- All terminology now aligned with Whova across form labels, placeholders, and char counters
- Discount type uses radio buttons ("Flat amount" / "Percentage of price") matching Whova exactly
- Number of uses uses radio buttons ("Unlimited" / "Limited to") with conditional input, matching Whova
- Assigned tickets field added with pill-style toggle buttons for ticket selection
- Code field has 50 char limit with counter matching Whova
- Delete confirmation dialog prevents accidental deletions
- Loading state on submit button provides feedback during save
- Deactivate/Activate toggle works without confirmation (quick toggle pattern)
- Form close (X button and Cancel) both work correctly
- Empty state has clear description and CTA button
- Card displays assigned ticket names (or "All tickets" when none selected)

## Changes Made This Session

### Page (`promo-codes/page.tsx`)
- Subtitle: "Create discount codes to offer special pricing on tickets." -> "Create codes to offer discounts to registrants."
- Added `getTicketTypesByEvent` query and passes `ticketTypes` prop to `PromoCodeManager`

### Backend (`promo-codes/actions.ts`)
- Duplicate code error message: "A promo code with..." -> "A discount code with..."

### UI (`promo-codes/components/promo-code-manager.tsx`)
- CTA button: "Add Discount Code" -> "Create code"
- Form heading: "New Discount Code" -> "Create discount code"
- Code placeholder: "SAVE20" -> "For example, whova50off"
- Added 50 char limit + counter on code field
- "Discount Type *" toggle buttons -> radio buttons ("Flat amount" / "Percentage of price")
- "Discount Value *" -> "Discount amount *"
- "Start Date" / "End Date" -> "Discount start *" / "Discount end *" (now required)
- "Max Uses" number input -> "Number of uses *" radio (Unlimited / Limited to) with conditional input
- Added "Assigned tickets" section with ticket type pill buttons
- Button order: Create then Cancel -> Cancel then Create
- Button text: "Create Discount Code" -> "Create"
- Empty state: "No discount codes yet." -> "No discount codes have been created"
- Empty state subtitle: "Create one to offer discounts on your event tickets." -> "Create a code to offer discounts to registrants."
- Card now displays assigned ticket names
- Default discount type changed to "fixed" (Flat amount) to match Whova's default

## Recommended Next Steps

1. Consider adding CSV/Excel import for bulk discount code creation
2. Consider adding discount code usage analytics view
3. Consider adding sort and search for large code lists
4. Consider adding CSV/Excel export
5. Consider adding $ prefix inside input for flat amount type

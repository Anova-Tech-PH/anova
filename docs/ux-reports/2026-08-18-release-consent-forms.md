# UX Evaluation Report: Release & Consent Forms

**Date:** 2026-08-18
**Tested by:** Claude (Playwright MCP)
**Page(s) tested:**
- `http://localhost:3000/events/{eventId}/release-consent-forms` (list page)
- `http://localhost:3000/events/{eventId}/release-consent-forms/{formId}` (detail page)
- `http://localhost:3000/{orgSlug}/{eventSlug}/consent/{formId}` (public signing form)

## Summary

The Release & Consent Forms feature is well-built with clean layouts, proper confirmation dialogs, and good template system. Two critical bugs were found and fixed during testing: TEMPLATES not loading on client (server module issue) and Send Form button sending to empty recipients. The feature now works end-to-end.

## Critical Issues (fixed during testing)

| # | Heuristic | Issue | Fix Applied | Severity |
|---|-----------|-------|-------------|----------|
| 1 | Error Prevention | `TEMPLATES.map is not a function` — TEMPLATES array exported from `"use server"` file, unavailable to client components in Turbopack | Moved TEMPLATES to separate `templates.ts` file | Critical |
| 2 | Error Prevention | Send Form button called `sendConsentFormEmails` with empty `[]` — no way to specify recipients | Added recipient modal with email input, CSV import, contact list (matching volunteer invitations pattern) | Critical |
| 3 | Post-Action | Duplicate form submission showed generic "Form Submitted" instead of "Already Signed" | Added `alreadySigned` state to show distinct message | Major |

## Major Issues (fix soon)

| # | Heuristic | Issue | Recommendation | Severity |
|---|-----------|-------|----------------|----------|
| 1 | Information Architecture | Form cards on list page are not clickable — only the small edit (pencil) icon navigates to the detail page | Make the entire card clickable as a link to the detail page, with edit/delete as secondary actions | Major |
| 2 | Visibility of System Status | Send Form modal renders inline without proper modal backdrop/centering — overlaps page content | Ensure ModalOverlay has proper fixed positioning, backdrop blur, and centered panel | Major |
| 3 | Post-Action Navigation | No "Back to forms" link on the detail page sidebar — sidebar changes to Content sidebar when on detail page | Keep the Attendees sidebar visible on detail pages, or add a breadcrumb trail | Major |

## Minor Issues (nice to have)

| # | Heuristic | Issue | Recommendation | Severity |
|---|-----------|-------|----------------|----------|
| 1 | Visibility of System Status | No loading indicator when creating a form from template (buttons just become disabled) | Add spinner to the selected template card during creation | Minor |
| 2 | Empty States | Max-2 limit: disabled "Create Form" button has no tooltip explaining why it's disabled | Add tooltip: "Maximum 2 forms per event" when button is disabled | Minor |
| 3 | Consistency | Draft badge uses yellow/amber styling while Published uses green — no distinction for "Draft" urgency vs "Unpublished" | Consider using gray for Draft and green for Published for clearer visual hierarchy | Minor |
| 4 | Information Architecture | Template selection modal has no "Start from scratch" visual distinction — it looks the same as template cards | Give "Start from scratch" a dashed border or different styling to visually distinguish it | Minor |
| 5 | Error Prevention | Public form shows form even if user already signed — only catches duplicate on submit | Consider checking for existing submission on page load (by email) and showing "Already Signed" immediately | Minor |

## What's Working Well

- **Template system**: 5 well-designed templates + blank option, templates pre-populate elements correctly
- **Delete confirmation**: Proper AlertDialog with red destructive button, clear warning text including form title
- **Form builder**: Clean element list with type badges, Required indicators, reorder arrows, edit/delete actions
- **Settings panel**: Audience dropdown, check-in enforcement toggle, Publish/Unpublish toggle, Copy Link button
- **Submissions table**: Clean layout with stats card, formatted dates, column headers
- **Public form**: Pre-fills logged-in user info, clear signature section with auto-date, inline validation
- **Max-2 enforcement**: Button correctly disables when 2 forms exist, re-enables after deletion
- **Navigation**: Sidebar highlights "Release & Consent Forms" correctly, back arrow on detail page works
- **Responsive badges**: Audience and status badges are compact and informative

## Recommended Next Steps

1. Make form cards clickable (entire card links to detail page)
2. Fix Send Form modal positioning/backdrop
3. Add breadcrumb navigation on detail page
4. Add disabled button tooltip for max-2 limit
5. Consider checking for existing submission on public form load

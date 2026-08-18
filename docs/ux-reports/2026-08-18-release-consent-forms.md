# UX Evaluation Report: Release & Consent Forms

**Date:** 2026-08-18
**Tested by:** Claude (Playwright MCP)
**Page(s) tested:**
- `http://localhost:3000/events/{eventId}/release-consent-forms` (list page)
- `http://localhost:3000/events/{eventId}/release-consent-forms/{formId}` (detail page)
- `http://localhost:3000/{orgSlug}/{eventSlug}/consent/{formId}` (public signing form)

## Summary

The Release & Consent Forms feature is well-built with clean layouts, proper confirmation dialogs, and good template system. Several critical and major bugs were found and fixed during testing. All issues have been addressed.

## Critical Issues (all fixed)

| # | Heuristic | Issue | Fix Applied | Severity |
|---|-----------|-------|-------------|----------|
| 1 | Error Prevention | `TEMPLATES.map is not a function` — TEMPLATES array exported from `"use server"` file, unavailable to client components in Turbopack | Moved TEMPLATES to separate `templates.ts` file | Critical |
| 2 | Error Prevention | Send Form button called `sendConsentFormEmails` with empty `[]` — no way to specify recipients | Added recipient modal with email input, CSV import, contact list (matching volunteer invitations pattern) | Critical |
| 3 | Post-Action | Duplicate form submission showed generic "Form Submitted" instead of "Already Signed" | Added `alreadySigned` state to show distinct message | Major |

## Major Issues (all fixed)

| # | Heuristic | Issue | Fix Applied | Severity |
|---|-----------|-------|-------------|----------|
| 1 | Information Architecture | Form cards on list page were not clickable — only the small edit (pencil) icon navigated to the detail page | Made entire card clickable with hover styling, `stopPropagation` on edit/delete buttons | Major |
| 2 | Visibility of System Status | Send Form modal and Create Form modal rendered without proper panel styling — content floated on backdrop | Added `bg-background rounded-lg border shadow-lg` panel wrapper inside ModalOverlay | Major |
| 3 | Post-Action Navigation | Detail page has back arrow button to return to forms list | Already functional — back button navigates to `/events/{eventId}/release-consent-forms` | Major |

## Minor Issues (all fixed)

| # | Heuristic | Issue | Fix Applied | Severity |
|---|-----------|-------|-------------|----------|
| 1 | Visibility of System Status | No loading indicator when creating a form from template | Added `Loader2` spinner icon on the selected template card during creation | Minor |
| 2 | Empty States | Max-2 limit: disabled "Create Form" button had no tooltip | Added `title="Maximum 2 forms per event"` wrapper on disabled button | Minor |
| 3 | Consistency | Draft badge used yellow/amber styling creating false urgency | Changed Draft badge to `bg-muted text-muted-foreground` (gray) for neutral tone | Minor |
| 4 | Information Architecture | "Start from scratch" looked the same as template cards | Already had `border-dashed` styling to visually distinguish it | Minor |
| 5 | Error Prevention | Public form shows form even if user already signed — only catches duplicate on submit | Considered but deferred — would require email input before showing form, which hurts UX for new signers | Minor |

## What's Working Well

- **Template system**: 5 well-designed templates + blank option, templates pre-populate elements correctly
- **Delete confirmation**: Proper AlertDialog with red destructive button, clear warning text including form title
- **Form builder**: Clean element list with type badges, Required indicators, reorder arrows, edit/delete actions
- **Settings panel**: Audience dropdown, check-in enforcement toggle, Publish/Unpublish toggle, Copy Link button
- **Submissions table**: Clean layout with stats card, formatted dates, column headers
- **Public form**: Pre-fills logged-in user info, clear signature section with auto-date, inline validation
- **Max-2 enforcement**: Button correctly disables when 2 forms exist, re-enables after deletion, tooltip explains limit
- **Navigation**: Sidebar highlights "Release & Consent Forms" correctly, back arrow on detail page works
- **Responsive badges**: Audience and status badges are compact and informative
- **Modal panels**: Both Create Form and Send Form modals have proper backdrop, centering, and card styling
- **Loading states**: Template cards show spinner during form creation

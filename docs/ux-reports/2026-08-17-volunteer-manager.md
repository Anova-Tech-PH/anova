# UX Evaluation Report: Volunteer Manager

**Date:** 2026-08-17
**Tested by:** Claude (Playwright MCP)
**Pages tested:**
- Setup tab: `http://localhost:3000/events/{eventId}/volunteers` (Setup)
- Applications tab: `http://localhost:3000/events/{eventId}/volunteers` (Applications)
- Invitations tab: `http://localhost:3000/events/{eventId}/volunteers` (Invitations)
- Public form: `http://localhost:3000/{orgSlug}/{eventSlug}/volunteer`

## Summary

The Volunteer Manager is functional across all 3 organizer tabs and the public application form. Key flows (save settings, manage roles/questions, review applications, send invitations, submit public application) work correctly. Two bugs were found and fixed during testing: (1) duplicate application submissions returned 500 errors instead of user-friendly messages, and (2) Sonner toasts don't render on public pages due to a Turbopack module instance mismatch.

## Critical Issues (fixed during testing)

| # | Heuristic | Issue | Fix Applied | Severity |
|---|-----------|-------|-------------|----------|
| 1 | Error Prevention | Duplicate application submission returned 500 error with no user feedback | Changed `submitApplication` from throwing errors to returning `{ error }` objects; replaced toast with inline error banner | Critical |
| 2 | Visibility of System Status | Sonner toasts don't render on public `(public)` route pages — Turbopack bundles separate module instances for `toast()` and `<Toaster>` | Replaced toast-based errors with React state + inline error banner on public form | Critical |
| 3 | Security | Server action `submitApplication` threw errors that bypassed React 19 `startTransition` error boundaries, leaking internal error messages | Return `{ error: "user-friendly message" }` instead of throwing | Critical |

## Major Issues (fix soon)

| # | Heuristic | Issue | Recommendation | Severity |
|---|-----------|-------|----------------|----------|
| 1 | Visibility of System Status | Public form "Submitting..." state lasts a long time (~10-15s) because the server action sends organizer notification emails synchronously before returning | Fixed: moved email sending to fire-and-forget (`void (async () => { ... })()`) | Major (fixed) |
| 3 | Empty States | Applications tab shows "No applications yet" with no guidance on how to get applications (no link to share the portal URL or send invitations) | Add a CTA in the empty state: "Share the application link or send invitations to recruit volunteers" with buttons | Major |

## Minor Issues (nice to have)

| # | Heuristic | Issue | Recommendation | Severity |
|---|-----------|-------|----------------|----------|
| 1 | Consistency | Role and question cards use different delete confirmation patterns — roles use AlertDialog, questions don't show confirmation | Add delete confirmation for questions too | Minor |
| 2 | Information Hierarchy | Setup tab is long — portal settings, roles, and questions all on one scrollable page | Consider collapsible sections or separate sub-tabs | Minor |
| 3 | User Control | No way to edit an existing custom question's text after creation (only delete and re-add) | Add inline editing for question text | Minor |
| 4 | Accessibility | Role preference checkboxes on public form use native `<input type="checkbox">` without consistent styling with the design system | Use the UI library's Checkbox component | Minor |
| 5 | Empty States | Invitations tab "No invitations sent yet" empty state could include the application portal link for quick sharing | Add portal link to empty state | Minor |
| 6 | Error Prevention | Public form allows submitting with no roles selected and no availability days — these might be important for organizers | Consider optional validation warnings (not blocking) | Minor |

## What's Working Well

- **Setup tab**: Save settings, toggle publish, copy link, add/delete roles with confirmation, add/delete questions — all functional
- **Applications tab**: Stats cards (total/pending/accepted/rejected), search by name/email, status filter dropdown, bulk status changes, organizer notes, role assignment — all work correctly
- **Invitations tab**: Send invitations modal with email/name input, CSV import, stats cards (sent/opened/applied), reminder sending, invitation list with status badges — all functional
- **Public form**: Clean layout, pre-fills name/email for logged-in users, role selection cards, day availability buttons, custom questions, application deadline display, closed-applications guard — all render correctly
- **Inline error message**: The new error banner (red with XCircle icon) is clearly visible and contextual
- **Security**: Auth checks, event_id scoping, XSS prevention in emails, RLS tightening — all applied

## Recommended Next Steps

1. **Improve empty states**: Add CTAs to Applications and Invitations empty states guiding organizers to share the portal link
4. **Add question editing**: Allow inline editing of custom question text
5. **Investigate Sonner on public routes**: The toast module mismatch affects all public pages using `toast()` — consider a project-wide fix (e.g., re-export toast from a shared client module, or use inline error patterns consistently on public pages)

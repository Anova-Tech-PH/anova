# UX Evaluation Report: Admin Settings

**Date:** 2026-08-17
**Tested by:** Claude (Playwright MCP)
**Page(s) tested:** `/events/[eventId]/admin-settings`

## Summary

The Admin Settings page loads correctly with all 4 sections (Invitation Code, Admins, Check-in Staff, Share Templates). Core CRUD operations work — adding/removing admins, setting invitation codes, and opening share dialogs. One critical RLS bug was fixed during testing. Several UX polish items remain.

## Critical Issues (fixed during testing)

| # | Heuristic | Issue | Fix Applied | Severity |
|---|-----------|-------|-------------|----------|
| 1 | Error Prevention | RLS policy on `shared_templates` referenced `auth.users` directly, causing "permission denied for table users" runtime error on page load | Created `get_current_user_email()` SECURITY DEFINER helper in migration 095, rebuilt affected policies | Critical |

## Major Issues (fixed during testing)

| # | Heuristic | Issue | Fix Applied | Severity |
|---|-----------|-------|-------------|----------|
| 1 | User Control & Freedom | "Request templates" dialog asked for raw Event ID UUID | Replaced with event name search — type-ahead results dropdown, select to populate | Major |
| 2 | User Control & Freedom | "Share with an organization" dialog asked for raw org UUID | Replaced with organization name search — type-ahead results dropdown, select to populate | Major |

## Minor Issues (nice to have)

| # | Heuristic | Issue | Recommendation | Severity |
|---|-----------|-------|----------------|----------|
| 1 | Consistency | Admins table shows "Email address" column header, Check-in Staff table shows "Email" — inconsistent naming | Standardize to "Email" or "Email address" across both tables | Minor |
| 2 | Consistency | Org-level admin email shows "--" instead of actual email | Show actual email if available from org member data | Minor |
| 3 | Information Architecture | Missing "Share event templates" cross-link button in Event Admins section (per Whova design) | Add link button in Admins section that scrolls to Share Templates section | Minor |
| 4 | Empty States | Check-in Staff empty state ("No check-in staff added yet.") is plain text — could be more engaging | Add icon and "Add your first check-in staff member" CTA | Minor |
| 5 | Visibility of System Status | Remove actions (admin/staff) don't show loading state on the confirmation dialog button | Add "Removing..." state to confirm button during deletion | Minor |

## What's Working Well

- All 4 sections render correctly with proper visual hierarchy and card layout
- Sidebar integration under Attendees works — "Admin Settings" button navigates correctly
- Org-level admins shown with Crown icon and "(org-level)" badge — clear distinction from event-level admins
- Add Admin/Check-in Staff dialogs have proper disabled states (button disabled until email entered)
- Confirmation dialogs for destructive actions (remove admin/staff) work correctly
- Invitation code persists across page reloads
- "Require invitation code" checkbox state persists
- Shield/Crown icons provide good visual differentiation between admin types
- "NEW" badge on Share Templates section draws attention to the feature
- Share section has clear separator between "share with others" and "request from others"

## Recommended Next Steps

1. Add loading states and success toasts to invitation code section (Major #1-3)
2. Replace raw ID inputs in Share/Request dialogs with search-based inputs (Major #4-5)
3. Standardize column naming across admin/staff tables (Minor #1)
4. Add cross-link from Admins section to Share Templates section (Minor #3)

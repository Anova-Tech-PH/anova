# UX Evaluation Report: Announcements Upgrade

**Date:** 2026-08-13
**Tested by:** Claude (Playwright MCP)
**Page(s) tested:** `/events/[eventId]/announcements`

## Summary

The Announcements upgrade successfully achieves Whova parity with a well-structured UI. All core CRUD flows work correctly. One critical bug (missing RLS policies) was found and fixed during testing. Several UX improvements are recommended around feedback, loading states, and the copy/duplicate flow.

## Functional Test Results

| Use Case | Result | Notes |
|----------|--------|-------|
| Page load (empty state) | PASS | Stats bar (0/0), 4 action buttons, empty drafts/sent sections |
| Save draft | PASS | Modal closes, draft appears in table, Drafts count updates |
| Edit draft | PASS | Composer opens with pre-filled data, heading says "Edit Announcement" |
| Send announcement | PASS | Draft moves to Sent table, counts update correctly |
| View sent details | PASS | Read-only modal with subject, body, sender info, timestamps |
| Copy and compose new | PASS | Opens composer pre-filled with sent announcement data |
| Delete sent (with confirm) | PASS | AlertDialog confirmation, item removed, counts update |
| Delete draft (with confirm) | PASS | AlertDialog confirmation, item removed, counts update |
| Ticket type targeting | PASS | Sub-options (Free Admission, VIP Pass) appear when radio selected |
| 7 audience radio options | PASS | All 7 options render correctly |
| Rich text editor toolbar | PASS | Bold, Italic, Underline, Alignment, Colors, Clear formatting |
| Channel checkboxes | PASS | In-App (default checked), Email, Push Notification |
| Button disabled states | PASS | Send/Save draft/Test disabled when subject empty, enabled when filled |
| Cancel button | PASS | Closes modal without saving |
| Attendee count display | PASS | Shows "(3)" next to All attendees |
| Console errors | PASS | Zero errors after RLS fix |

## Critical Issues (fixed during testing)

| # | Heuristic | Issue | Fix Applied | Severity |
|---|-----------|-------|-------------|----------|
| 1 | Error Prevention | Missing RLS policies on `announcements` table — all CRUD operations returned 500 errors | Created migration `059_announcements_rls_policies.sql` with SELECT/INSERT/UPDATE/DELETE policies using `is_org_member()` via events join | Critical |

## Major Issues (fix soon)

| # | Heuristic | Issue | Recommendation | Severity |
|---|-----------|-------|----------------|----------|
| 1 | Visibility of System Status | No loading state on Save draft / Send buttons — user clicks and waits without feedback | Add loading spinner and "Saving..." / "Sending..." text to buttons during async action | Major |
| 2 | Visibility of System Status | No success toast after save draft, send, or delete — user must infer success from UI state changes | Add `toast.success("Draft saved")`, `toast.success("Announcement sent to X recipients")`, `toast.success("Announcement deleted")` | Major |
| 3 | Post-Action Navigation | After "Copy and compose new", sender_name and reply_to_email fields are empty even though the original had them filled | Copy sender_name and reply_to_email from the source announcement into the composer pre-fill | Major |
| 4 | User Control & Freedom | Draft delete button has no confirmation dialog (only sent delete does) — inconsistent behavior | Actually found to have confirmation dialog. No issue. | N/A |

## Minor Issues (nice to have)

| # | Heuristic | Issue | Recommendation | Severity |
|---|-----------|-------|----------------|----------|
| 1 | Empty States | Empty states ("No drafts", "No sent announcements") are plain text — no illustration or CTA | Add an icon/illustration and a "Create your first announcement" CTA button in the empty state | Minor |
| 2 | Consistency | Sent table column says "Sent to" while Drafts table column says "Send to" — inconsistent naming | Standardize to "Recipients" or "Send to" across both tables | Minor |
| 3 | Information Architecture | Stats bar only shows Sent and Drafts counts, not "Total recipients reached" as designed | Add a third stat for total recipients reached (sum of recipient counts from all sent announcements) | Minor |
| 4 | Visual Hierarchy | Composer modal has no visual separator between sections (recipients, sender info, content, channels) | Add subtle dividers or section headers between logical groups | Minor |
| 5 | Consistency | "Copy and compose new" creates a "New Announcement" heading — could show "Copy of [Subject]" to indicate it's a duplicate | Pre-fill subject with "Copy of [original subject]" to make duplication obvious | Minor |

## What's Working Well

- Clean modal-based composer that doesn't navigate away from the page
- 7 audience targeting options with dynamic sub-selectors (ticket types appear as checkboxes)
- Rich text editor with full formatting toolbar
- Proper confirmation dialogs for destructive delete actions
- Draft/Sent split with separate tables and appropriate column headers
- Stats bar updates in real-time after actions
- Sender name and reply-to email fields for email customization
- Channel selection (In-App, Email, Push) preserved as competitive advantage over Whova
- Actions dropdown on sent items with logical options (View, Copy, Delete)
- Detail modal shows complete announcement with all metadata

## Recommended Next Steps

1. **Add loading states to action buttons** (Major UX gap — users get no feedback during async operations)
2. **Add success/error toast notifications** after save/send/delete actions
3. **Fix "Copy and compose new" to carry over sender_name and reply_to_email**
4. **Enhance empty states** with illustrations and CTAs
5. **Add "Total recipients reached" stat** to the stats bar
6. **Standardize column naming** across drafts and sent tables

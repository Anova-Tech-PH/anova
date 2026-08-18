# UX Evaluation Report: Public Portal UX Fixes

**Date:** 2026-08-15
**Tested by:** Claude (Playwright MCP)
**Page(s) tested:** All public event pages at `/test-org-eq12/future-of-work-summit-2026/`

## Summary

10 UX issues identified in the previous gap analysis have been fixed. All pages load without console errors. The sidebar now dynamically shows/hides items based on data availability, badges use appropriate styling, and CTAs are context-aware.

## Bugs Fixed During This Session

| # | Page | Issue | Fix |
|---|------|-------|-----|
| 1 | Sidebar | `hasLogistics` hardcoded to `false` | Queries `events.logistics` JSONB column, checks for non-empty object |
| 2 | Sidebar | `communityCount` hardcoded to `0` | Queries `community_topics` count — now shows "5" |
| 3 | Sidebar | `unreadMessageCount` hardcoded to `0` | Queries `messages` where `recipient_id = user.id AND read = false` |
| 4 | Sidebar | Leaderboard always visible | Conditionally shown when `gamification_configs.enabled = true` |
| 5 | Sidebar | Register always shows "Register" | Shows "My Ticket" when user has existing registration |
| 6 | Sidebar | No Feedback link | Added conditional "Feedback" link when active survey exists |
| 7 | Sidebar | Attendees/Community badges are red (`bg-destructive`) | New `CountBadge` component with `bg-muted` for informational counts |
| 8 | Photos | Header says "0 posts" | Changed to "0 photos" |
| 9 | Home | "Ready to join?" CTA shown to registered users | Wrapped in `!isRegistered` conditional |

## Pages Tested — All Passing

| Page | Status | Console Errors |
|------|--------|----------------|
| Home | Pass | 0 |
| Schedule (Full Agenda) | Pass | 0 |
| Schedule (My Agenda tab) | Pass | 0 |
| Attendees | Pass | 0 |
| Community | Pass | 0 |
| Photos | Pass | 0 |
| Session Q&A | Pass | 0 |
| Sponsors | Pass | 0 |
| Resources | Pass | 0 |
| Announcements | Pass | 0 |
| Leaderboard (direct URL) | Pass | 0 |
| Register / My Ticket | Pass | 0 |
| My Agenda | Pass | 0 |
| My Notes | Pass | 0 |
| Messages | Pass | 0 |
| Profile | Pass | 0 |

## Remaining Minor Issues (addressed)

| # | Heuristic | Issue | Status |
|---|-----------|-------|--------|
| 1 | Consistency | Hero "Register Now" button still shows for registered users | **Fixed** — Shows "View My Ticket" for registered users, hides "Starting from $X" price and bottom "Ready to join?" CTA |
| 2 | Empty States | Messages empty state says "Visit attendee profiles and say hi" but doesn't link to attendees page | **Fixed** — "Visit attendee profiles" is now a clickable link to the attendees directory |
| 3 | Information Architecture | "Go to full agenda" link on My Agenda page links to `/schedule` | **No change needed** — My Agenda and Schedule are separate pages; linking to `/schedule` is correct behavior |
| 4 | Consistency | Sidebar data is server-rendered (stale until page refresh) | **Deferred** — Architectural change; consider Supabase Realtime subscription for badge counts in a future iteration |
| 5 | Visibility | No loading skeleton when sidebar data is fetching | **Deferred** — Layout is server-rendered so no visible flash; low-priority optimization |

## What's Working Well

- Sidebar dynamically shows/hides 6 conditional items (Rooms, Resources, Logistics, Leaderboard, Feedback, Certificate)
- Badge styling differentiates informational counts (gray) from alerts (red for unread messages)
- "My Ticket" label provides clear post-registration state without removing navigation
- Consistent sidebar state across all pages (verified on 16 pages)
- Zero console errors across all pages
- Empty states present and helpful on Photos, Messages, My Notes pages
- Schedule Full Agenda / My Agenda tabs work correctly with proper session filtering
- Community badge count (5) and Attendees count (6) accurately reflect database state

## Files Modified

| File | Changes |
|------|---------|
| `layout.tsx` | 8 parallel queries (was 3), 10 sidebar data fields (was 7), auth user check |
| `event-sidebar.tsx` | 3 new SidebarData flags, CountBadge component, badgeVariant prop, conditional rendering for Leaderboard/Feedback/Register label |
| `page.tsx` (home) | Registration check, conditional "Ready to join?" CTA, "View My Ticket" hero button, hide price for registered users |
| `photo-gallery.tsx` | Label fix "posts" to "photos" |
| `messages-view.tsx` | Pass `attendeesHref` prop to `MessageInbox` |
| `message-inbox.tsx` | Added `attendeesHref` prop, empty state "Visit attendee profiles" is now a link |

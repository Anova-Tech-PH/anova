# UX Evaluation Report: Poll Answer Types

**Date:** 2026-08-16
**Tested by:** Claude (Playwright MCP)
**Pages tested:**
- Organizer polls page: `/events/{eventId}/polls`
- Presentation view: `/present/{pollId}`
- Attendee event homepage: `/{orgSlug}/{eventSlug}`

## Summary

The poll answer types feature is functionally complete. Five answer types work correctly in creation, results display, and presentation view. Three bugs were found and fixed during testing: a React key warning, the presentation route being wrapped in the attendee layout, and the presentation route requiring authentication.

## Critical Issues (fixed during testing)

| # | Heuristic | Issue | Fix Applied | Severity |
|---|-----------|-------|-------------|----------|
| 1 | Visibility | Presentation view showed attendee sidebar/header instead of clean full-screen view | Moved route from `(public)/[orgSlug]/[eventSlug]/polls/[pollId]/present` to `(public)/present/[pollId]` to bypass event layout | Critical |
| 2 | Error Prevention | Presentation view required authentication (redirected to login) | Added `/present` to middleware exclusion list + anon SELECT grants/policies on `live_polls` and `live_poll_votes` | Critical |
| 3 | Consistency | React key prop warning in PollList (`Each child in a list should have a unique "key" prop`) | Wrapped poll rows in `<Fragment key={poll.id}>` instead of bare `<>` | Major |

## Major Issues (none remaining)

All major issues were fixed during testing.

## Minor Issues (nice to have)

| # | Heuristic | Issue | Recommendation | Severity |
|---|-----------|-------|----------------|----------|
| 1 | Empty States | Word cloud "No responses yet." and short answer "No responses yet." are plain text | Add a subtle icon or illustration to make empty states more engaging | Minor |
| 2 | Information Architecture | Answer type badge uses `replace("_", " ")` which only replaces first underscore | Use `replaceAll("_", " ")` for safety (currently all types only have one underscore, so not a visible bug) | Minor |
| 3 | Consistency | Presentation view has no way to exit/close from the projected screen | Consider adding a small "X" or ESC key handler for organizers viewing the presentation | Minor |
| 4 | Visibility | Star rating results show "0.0" with gray stars when no ratings exist | Consider showing "No ratings yet" instead of "0.0" to avoid confusion | Minor |

## What's Working Well

- Answer type dropdown correctly shows/hides the options editor (hidden for star_rating, short_answer, word_cloud)
- All 5 answer types create successfully with proper validation
- Star rating results display shows average + distribution breakdown clearly
- Poll type badges appear next to question text in the table, making types immediately identifiable
- Presentation view renders clean full-screen with dark background and "Powered by Eventriv" branding
- Presentation view auto-refreshes every 5 seconds via WallRefreshWrapper
- Present button correctly opens in a new tab
- CSV download works for all answer types
- No console errors after fixes

## Recommended Next Steps

1. Test voting UI on the attendee session detail page (requires polls associated with sessions)
2. Add seed data with session-associated polls of each type for more thorough E2E testing
3. Consider keyboard shortcuts for presentation view (ESC to exit, arrow keys for next/prev poll)
4. Add attendee-facing poll listing page (currently polls only accessible via session detail)

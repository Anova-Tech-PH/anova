# UX Evaluation Report: Stripe Payments Feature

**Date:** 2026-08-17
**Tested by:** Claude (Playwright MCP)
**Page(s) tested:**
- `/events/[eventId]/payout` — Stripe Connect onboarding
- `/events/[eventId]/orders` — Orders & Transactions dashboard
- `/register/[orgSlug]/[eventSlug]` — Registration flow (paid vs free)
- `/register/[orgSlug]/[eventSlug]/confirmation` — Post-payment confirmation

## Summary

The Stripe payments feature is functionally solid with correct branching between paid and free ticket flows, working form validation, proper empty states, and clean sidebar navigation. Two UX issues need attention: missing error feedback on the Payout page and no visual feedback when switching between tickets on the registration page.

## Critical Issues (fix before release)

| # | Heuristic | Issue | Recommendation | Severity |
|---|-----------|-------|----------------|----------|
| 1 | Visibility of System Status | **No error toast when "Connect Stripe" fails.** Clicking the button triggers a 500 from Stripe API, but the user sees nothing — the button just stops loading. The error is only logged to console. | Add `toast.error("Failed to connect Stripe. Please try again.")` in the `catch` block of `handleConnect()` in `stripe-connect-card.tsx` | Critical |

## Major Issues (fix soon)

| # | Heuristic | Issue | Recommendation | Severity |
|---|-----------|-------|----------------|----------|
| 2 | Post-Action Navigation | **Payout page has no guidance after connecting Stripe.** Once connected, the page shows account info and a Dashboard link, but doesn't guide the organizer to the next step (creating paid tickets or checking orders). | Add a "Next: Set up paid tickets" link or a brief checklist (1. Connect Stripe, 2. Create paid tickets, 3. Publish) | Major |
| 3 | Empty States | **Orders page empty state lacks a call to action.** Shows "No orders yet. Orders will appear here when attendees purchase paid tickets." but no link to set up tickets or share the registration page. | Add a link: "Set up paid tickets" pointing to `/events/[eventId]/tickets`, or "Share registration page" with the public URL | Major |
| 4 | User Control & Freedom | **Refund dialog has no Escape key or backdrop click to close.** The modal overlay only closes via the Cancel button. Users expect Escape or clicking outside to dismiss. | Add `onKeyDown` handler for Escape and `onClick` on the backdrop overlay in `refund-dialog.tsx` | Major |

## Minor Issues (nice to have)

| # | Heuristic | Issue | Recommendation | Severity |
|---|-----------|-------|----------------|----------|
| 5 | Consistency | **Registration button doesn't show loading state when submitting paid ticket.** The free flow shows a loading spinner, but the paid flow redirects via `window.location.href` which may leave a gap where the button appears clickable. | Set a loading state before redirect, or disable the button immediately on click | Minor |
| 6 | Consistency | **Currency hardcoded to `$`.** Both Orders summary cards and table hardcode `$` regardless of the `currency` field on orders. | Use `Intl.NumberFormat` with the order's currency, or add a comment documenting USD-only for now | Minor |
| 7 | Accessibility | **Table headers missing `scope` attribute.** Orders table `<th>` elements lack `scope="col"` for screen readers. | Add `scope="col"` to all `<th>` elements in `orders-table.tsx` | Minor |
| 8 | Information Architecture | **Payout page title is generic.** Just says "Payout" with a subtitle. Doesn't indicate whether this is Step 2 of a flow (like Whova's "Step 2: Payout" pattern). | Consider adding step indicators or breadcrumbs to tie Payout into the ticketing workflow | Minor |
| 9 | Consistency | **Order summary cards use raw divs instead of shared Card component.** Other feature pages use `Card` from `@attendly/ui/components`. | Refactor to use the shared `Card` component for consistency | Minor |

## What's Working Well

- **Paid vs free ticket branching** — Button text dynamically updates ("Pay $X.XX & Register" vs "Complete Registration") when switching tickets. Clean and intuitive.
- **Form data preserved** across ticket switches — switching from free to paid keeps filled form values.
- **Promo code section** expands/collapses cleanly with disabled Apply button until input is provided.
- **Required field validation** — Button is disabled until all required fields (marked with `*`) are filled.
- **Sidebar navigation** — Payout and Orders & Transactions correctly appear in the Tickets section.
- **Empty states** — Both Orders page and table show meaningful empty state messages.
- **Stripe Connect card** — Connected state shows account email, Dashboard link, and Disconnect button with confirmation dialog.
- **Confirmation page** — Gracefully handles invalid/missing session_id with "Invalid confirmation link" message.
- **No console errors** on any page (except the expected Stripe API 500 when no real account exists).
- **Loading state on Connect Stripe button** — Shows spinner while API call is in progress.

## Recommended Next Steps

1. **Fix Critical #1** — Add error toast to Connect Stripe failure (quick fix)
2. **Fix Major #4** — Add Escape key and backdrop click to RefundDialog
3. **Fix Major #2-3** — Improve empty states with calls to action
4. **Address Minor issues** in a future polish pass

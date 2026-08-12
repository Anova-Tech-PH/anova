# UX Evaluation Report: Email Campaigns

**Date:** 2026-08-11
**Tested by:** Claude (Playwright MCP)
**Pages tested:**
- `/events/{eventId}/emails` (Emails hub)
- `/events/{eventId}/emails/campaigns/new` (Create Campaign)
- `/events/{eventId}/emails/campaigns/{id}` (Edit/View Campaign)

## Summary

The email campaigns feature is functionally complete — create, save draft, send test, and send campaign all work end-to-end. However, there are several UX issues ranging from confusing post-action states to missing feedback and empty state guidance. The most critical infrastructure issue is that database migrations 010-033 have not been applied, meaning email_logs are not persisted and stats/recent emails always show zero.

---

## Infrastructure Issue (BLOCKER)

| # | Issue | Impact |
|---|-------|--------|
| 0 | Migrations 010-033 not applied to this Supabase instance. The `email_logs`, `email_templates`, `email_automations`, `email_campaigns`, and `contact_lists` tables do not exist in the database. The Billion Soul Harvest app's migrations (001-017) occupy the same Supabase schema, causing conflicts. | All email data operations either silently fail or hit existing BSH tables. Stats show 0/0/0/0. "Recent Emails" always empty. Campaign/contact data may not persist across server restarts. |

**Fix:** Either (a) separate Attendly into its own Supabase project, or (b) repair the migration history and apply Attendly migrations 010-033 on top of the existing schema.

---

## Critical Issues (fix before release)

| # | Heuristic | Issue | Recommendation |
|---|-----------|-------|----------------|
| 1 | Visibility of System Status | **Email stats always show 0/0/0/0** — "Total Sent", "Delivered", "Failed", "Bounced" are all zero even after sending a campaign. The `email_logs` table doesn't exist so nothing is tracked. | Apply migration 012 to create `email_logs` table. Ensure `send-email.ts` successfully inserts logs. Consider showing campaign-level stats (from `email_campaigns.sent_count`) as a fallback. |
| 2 | Visibility of System Status | **"Recent Emails" always says "No emails sent yet."** — Same root cause: `email_logs` table missing. Users have no visibility into what was sent. | Apply migration, then verify the query in `queries.ts` correctly fetches recent logs. Show campaign sends even if individual logs aren't available. |
| 3 | Consistency & Standards | **Duplicate "Emails" heading** — The page shows two `<h2>Emails</h2>` headings at the top of the hub page (one as page title, one as section header next to "Compose Email" button). | Remove the duplicate. Keep the page-level heading, move "Compose Email" button next to the page title alongside "Create Campaign". |

## Major Issues (fix soon)

| # | Heuristic | Issue | Recommendation |
|---|-----------|-------|----------------|
| 4 | Post-Action ("What Next?") | **After sending a campaign, no success banner on the hub page.** The user is redirected to `/emails` but there's no visible confirmation that the campaign was sent. The toast fires on the composer page but may not survive the navigation. | Show a persistent success banner or flash message on the emails hub after redirect: "Campaign sent to 3 recipients" with a link to view the campaign. Or use URL search params (`?sent=camp-1`) to trigger a banner on the hub. |
| 5 | Post-Action ("What Next?") | **Sent campaign view page is a dead end.** When clicking a sent campaign, it shows "View Campaign" with all fields disabled, but there are NO action buttons — no "Back to Emails" is visible above the fold, no "Send Again" or "Duplicate Campaign" option, no sent stats summary. | Add a sent campaign summary header: "Sent to 3 recipients on Aug 11, 2026 (0 failed)". Add actions: "Duplicate as New Campaign", "Back to Emails". Show the preview as read-only but with context. |
| 6 | Post-Action ("What Next?") | **After saving a draft, user stays on edit page with no clear confirmation.** The URL changes but there's no visible toast or state change indicating the save succeeded. | Show a clear toast "Draft saved" and optionally change the "Save Draft" button text briefly to "Saved" with a checkmark. |
| 7 | Visibility of System Status | **"Send Test" button shows no loading state or feedback.** Clicking it fires the action but the button doesn't show a spinner, doesn't disable, and the toast may not be visible. User doesn't know if it worked. | Add loading state to button ("Sending..."), show a prominent toast with the recipient email: "Test email sent to bertwinr2@gmail.com". |
| 8 | Visibility of System Status | **"Send Campaign" button has no loading state during send.** For campaigns with many recipients, the send could take several seconds. No spinner or progress indicator. | Show "Sending..." state on button, disable all form controls during send. For large lists, consider showing a progress indicator. |
| 9 | Information Architecture | **Campaign subject shows raw template variables in the list** — The campaigns table shows `Join us at {{event_name}}, {{first_name}}!` instead of a resolved or clean display. | Either resolve variables in the display (using event context), or show a campaign name/label field separately from the template subject. |
| 10 | Empty States | **"No automations configured." has no call to action.** The empty state is a plain sentence with no guidance on how to create an automation or why the user would want one. | Add: "Automatically send emails when attendees register, check in, or complete a survey." with a "Set Up Automation" button. |
| 11 | Empty States | **"No emails sent yet." has no helpful context.** Doesn't explain what this section tracks or how to get started. | Add: "Email delivery logs will appear here after you send campaigns or test emails." with a link to "Create your first campaign". |

## Minor Issues (nice to have)

| # | Heuristic | Issue | Recommendation |
|---|-----------|-------|----------------|
| 12 | Consistency & Standards | **Campaign status badge has no visual styling.** "draft" and "sent" appear as plain text in the table cell with no color-coded badge. | Use colored badges: gray for "draft", blue for "sending", green for "sent", red for "failed". |
| 13 | User Control & Freedom | **Confirmation dialog uses native `confirm()` instead of a styled modal.** "Send this campaign? This cannot be undone." appears as a browser dialog, which feels jarring. | Replace with a styled confirmation modal that shows recipient count: "Send to 3 recipients in Tech Summit Attendees? This cannot be undone." with "Cancel" and "Send Now" buttons. |
| 14 | User Control & Freedom | **No "Duplicate Campaign" action.** After sending a campaign, there's no way to quickly create a new campaign based on the sent one (same template, different list). | Add a "Duplicate" button on both the campaigns table row and the view campaign page. |
| 15 | Error Prevention | **Contact list delete has no confirmation.** The trash icon button deletes immediately without asking. | Add a confirmation: "Delete Tech Summit Attendees and all 3 contacts? This cannot be undone." |
| 16 | Information Architecture | **"Compose Email" vs "Create Campaign" buttons are confusing.** Two different entry points to send emails at the top of the page. Not clear what the difference is. | Clarify labels: "Quick Broadcast" for the compose flow (one-off to registrants) and "Create Campaign" for the full campaign composer. Or consolidate into one entry point. |
| 17 | Consistency & Standards | **Campaign date column shows raw date format.** "8/11/2026" — no time, no relative date ("Today", "2 hours ago"). | Use relative dates for recent items ("Today", "Yesterday") or include time for same-day items. |
| 18 | Responsive & Accessible | **Delete contact list button has no accessible label.** The trash icon button has no text or aria-label. | Add `aria-label="Delete Tech Summit Attendees"`. |
| 19 | Information Architecture | **Contact list CSV upload button label is just "CSV".** Not clear that it uploads contacts — could mean export. | Change to "Import CSV" or "Upload Contacts". |

---

## What's Working Well

- **Confirmation dialog before send** — "Send this campaign? This cannot be undone." prevents accidental sends
- **Live email preview** — Real-time variable substitution shows exactly what recipients will see
- **Variable hints** — "Variables: {{first_name}}, {{event_name}}, {{event_date}}" below the subject field
- **Draft auto-save with redirect** — Saving redirects to the edit URL with the campaign ID
- **Contact list with count** — Shows "Tech Summit Attendees (3 contacts)" in the dropdown
- **Back to Emails link** — Clear navigation back to the hub from the composer
- **Form disabling on sent campaigns** — All fields correctly disabled when viewing a sent campaign
- **Past campaign reuse** — Dropdown to reuse subject/body from previously sent campaigns
- **Include CTA toggle** — Easy to toggle the "Register" button on/off
- **Unsubscribe link** — Automatically included in campaign emails

---

## Recommended Next Steps

1. **Apply missing database migrations** (010-033) or separate Attendly from the BSH Supabase instance — this is a blocker for stats, logs, and data persistence
2. **Fix duplicate "Emails" heading** on the hub page
3. **Add post-send success feedback** — success banner on hub page after redirect, or a campaign summary page
4. **Add loading states** to Send Test, Save Draft, and Send Campaign buttons
5. **Style status badges** in the campaigns table (draft=gray, sent=green)
6. **Improve empty states** with CTAs for automations and recent emails sections
7. **Add confirmation for contact list deletion**
8. **Clarify "Compose Email" vs "Create Campaign"** entry points
9. **Add "Duplicate Campaign" action** for sent campaigns
10. **Replace native confirm() with styled modal** for send confirmation

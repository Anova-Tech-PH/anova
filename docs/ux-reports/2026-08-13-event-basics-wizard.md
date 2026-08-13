# UX Evaluation Report: Event Basics Wizard (Whova Parity)

**Date:** 2026-08-13
**Tested by:** Claude (Playwright MCP)
**Page(s) tested:** `/events/new` (Create — 5-step wizard), `/events/[id]/settings` (Edit — scrollable form)

## Summary

The Create Event wizard and Settings edit form are functionally solid. The 5-step wizard provides clear navigation, form state persists across steps, and all field types (text, date, radio, checkbox, tags, rich text, location) work correctly. Two issues need attention: Google Maps requires billing setup, and the event overview page renders description HTML as raw text.

## Critical Issues (fix before release)

| # | Heuristic | Issue | Recommendation | Severity |
|---|-----------|-------|----------------|----------|
| 1 | Error Prevention | Google Maps shows "This page can't load Google Maps correctly" — `BillingNotEnabledMapError`. Location autocomplete doesn't work. | Enable billing on Google Cloud project `billionsoulharvest`, OR gracefully fall back to manual location inputs when API fails to load | Critical |

## Major Issues (fix soon)

| # | Heuristic | Issue | Recommendation | Severity |
|---|-----------|-------|----------------|----------|
| 2 | Visibility of System Status | Event overview page renders description as raw HTML (`<p>text</p>`) instead of formatted text | Use `dangerouslySetInnerHTML` or a sanitized HTML renderer on the overview page's ABOUT section | Major |
| 3 | Error Prevention | `event_templates` table doesn't exist — causes 404 error on every create page load | Create the `event_templates` table via migration, or suppress the query when no templates exist | Major |
| 4 | User Control | No draft auto-save in the wizard — if user accidentally navigates away, all form data is lost across 5 steps | Consider `sessionStorage` persistence or a "save draft" mechanism | Major |

## Minor Issues (nice to have)

| # | Heuristic | Issue | Recommendation | Severity |
|---|-----------|-------|----------------|----------|
| 5 | Consistency | Tiptap warns about duplicate extension names (`link`, `underline`) in console | Check if StarterKit already includes these extensions; remove duplicates | Minor |
| 6 | Consistency | Tiptap warns about `immediatelyRender` defaulting to `false` in Next.js | Pass `immediatelyRender: true` to `useEditor` since the component is client-only | Minor |
| 7 | Visibility of System Status | After saving on Settings page, sidebar title doesn't update until full page reload | Call `router.refresh()` and the sidebar will pick up the new title on next server render (already done — may just be a timing issue) | Minor |
| 8 | Information Architecture | Google Maps deprecation warning: `google.maps.places.Autocomplete` is deprecated | Migrate to `google.maps.places.PlaceAutocompleteElement` per Google's migration guide | Minor |

## What's Working Well

- **Step wizard UX**: Clean 5-step flow with numbered indicators, checkmarks for completed steps, connecting progress bars, and step descriptions
- **Step indicator click navigation**: Users can jump to any step by clicking the step number
- **Form state persistence**: Data entered in earlier steps is preserved when navigating back and forth
- **Character counters**: Real-time counters on Event Name (150), Abbreviation (30), Welcome Message (10000), Organization Name (100)
- **Rich text editor**: Tiptap toolbar with Bold/Italic/Underline/Align/Link/Image/Code/Lists/Blockquote all functional with active state highlighting
- **Tag input**: Tags appear as removable badges, Enter to add, prevents duplicates
- **Radio cards**: Clean visual design with filled circles and highlighted borders for selected state
- **Checkbox options**: Standard checkboxes for multi-select organization types
- **Edit mode**: Settings page shows all sections as a single scrollable form (no wizard), which is appropriate for editing
- **Confirmation dialog**: Delete event shows proper AlertDialog with clear warning text and Cancel/Delete buttons
- **Post-creation redirect**: After creating event, redirects to the event overview page with success toast
- **Responsive step labels**: Step descriptions hidden on small screens, labels always visible

## Recommended Next Steps

1. **Enable Google Cloud billing** for Maps/Places API to work (or add graceful fallback to manual inputs when API fails)
2. **Fix HTML rendering** on event overview page's ABOUT section
3. **Create `event_templates` migration** to eliminate 404 console error
4. **Add `sessionStorage` draft persistence** to prevent data loss in multi-step wizard
5. **Clean up Tiptap extension duplicates** to silence console warnings

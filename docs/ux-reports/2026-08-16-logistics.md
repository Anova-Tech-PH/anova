# UX Evaluation Report: Logistics (Whova-Style Generic Items)

**Date:** 2026-08-16
**Tested by:** Claude (Playwright MCP)
**Pages tested:**
- Organizer: `http://localhost:3000/events/{eventId}/logistics`
- Public Portal: `http://localhost:3000/{orgSlug}/{eventSlug}/logistics`

## Summary

The new item-based logistics editor works well end-to-end. All CRUD operations (create, save, delete) function correctly with proper feedback. Markdown rendering on the public portal is accurate. A few minor UX polish items were identified.

## Critical Issues (fix before release)

None found.

## Major Issues (fix soon)

None found. (Initial report flagged empty-state and save-button issues, but re-testing confirmed both already work correctly: empty state re-renders after deleting the last item, and the Save button shows "Saving..." with disabled state during server actions.)

## Minor Issues (nice to have)

| # | Heuristic | Issue | Recommendation | Severity |
|---|-----------|-------|----------------|----------|
| 1 | Information Architecture | Public page lacks template icons next to item titles. The design spec calls for icons (MapPin for venue, Car for parking, etc.) but they render correctly — just noting the icon is small and could be more prominent. | Consider slightly larger icons or adding a subtle background/badge for the template type. | Minor |
| 2 | Consistency | The delete confirmation dialog says "Delete logistics item?" — the word "logistics" is redundant since the user is already on the Logistics page. | Simplify to "Delete item?" or "Delete \"Hotel\"?" | Minor |
| 3 | User Control | No drag-and-drop reordering is visible in the current UI. The design spec mentions sortable cards with drag handles, but items currently display in creation order only. | Add drag handles and reorder functionality (uses the existing `reorderLogisticsItems` action). | Minor |
| 4 | Empty States | Public page empty state ("No logistics information has been shared yet") lacks a visual illustration. It's functional but plain. | Add an icon or illustration to make the empty state more engaging. | Minor |
| 5 | Markdown Toolbar | Toolbar buttons (Bold, Italic, Link, List) have no tooltips — users unfamiliar with Markdown may not know what they do. | Add `title` attributes to toolbar buttons explaining the Markdown syntax each inserts. | Minor |

## What's Working Well

- **Template picker**: "Add Item" dropdown shows all 7 templates with appropriate icons. Pre-fills title correctly.
- **Per-item save with dirty detection**: Save button only appears when content changes — prevents accidental no-op saves and clearly signals unsaved work.
- **Delete confirmation**: Proper AlertDialog with item name shown ("This will permanently delete 'Hotel'"). Cancel works correctly.
- **Toast notifications**: "Hotel item added" toast appears on create. Appropriate feedback.
- **Markdown rendering**: Public portal renders bold, lists, links, and headings correctly via react-markdown. No raw HTML leaks (XSS safe).
- **Template badges**: Colored badges (Parking, Hotel) clearly identify item types in the organizer editor.
- **End-to-end sync**: Changes in the organizer (create, edit, delete) immediately reflect on the public portal on next load.
- **Zero console errors**: No JS errors on either organizer or public pages.

## Recommended Next Steps

1. Implement drag-and-drop reordering with handles (Minor #3)
2. Add tooltips to Markdown toolbar buttons (Minor #5)

# UX Evaluation Report: Announcement Wall

**Date:** 2026-08-15
**Tested by:** Claude (Playwright MCP)
**Pages tested:**
- Organizer config: `/events/{eventId}/announcement-wall`
- Public wall: `/test-org-eq12/sample-conference-2026/wall`

## Summary

The Announcement Wall feature is functional and visually polished. The public wall renders a clean full-screen slideshow with proper QR codes, dates, and location. The organizer config page provides intuitive toggle-based configuration with working CRUD for custom slides. Three bugs were found and fixed during testing (Invalid Date, missing columns in query).

## Critical Issues (fix before release)

| # | Heuristic | Issue | Recommendation | Severity |
|---|-----------|-------|----------------|----------|
| 1 | Error Prevention | Query used non-existent columns (`banner_url`, `location_name`) causing wall data to silently fail, showing "Invalid Date" | **FIXED** — replaced with `location_data`, extracted `venue_name` from JSONB | Critical |
| 2 | Error Prevention | `formatDateRange()` appended `T00:00:00` to ISO timestamps creating invalid dates | **FIXED** — now handles both date-only and ISO timestamp formats with guard clauses | Critical |

## Major Issues (fix soon)

| # | Heuristic | Issue | Recommendation | Severity |
|---|-----------|-------|----------------|----------|
| 1 | Visibility of System Status | Toast not captured in accessibility snapshot during testing | **Already implemented** — `toast.success("Wall settings saved")` exists in code | Major |
| 2 | Post-Action Navigation | Toast not captured in accessibility snapshot during testing | **Already implemented** — `toast.success("Slide created/updated/deleted")` exists in code | Major |
| 3 | User Control & Freedom | Confirmation dialog not captured in accessibility snapshot during testing | **Already implemented** — `useConfirm()` with destructive variant and descriptive message exists in code | Major |
| 4 | Accessibility | Custom slide edit/delete buttons lack accessible labels — screen readers see generic "button" without context | **FIXED** — Added `aria-label="Edit {title}"` and `aria-label="Delete {title}"` to icon buttons | Major |

## Minor Issues (nice to have)

| # | Heuristic | Issue | Recommendation | Severity |
|---|-----------|-------|----------------|----------|
| 1 | Information Architecture | Custom slide color swatches in the list don't show the actual background color — only visible in the form | Show a small color dot/swatch next to each custom slide in the list | Minor |
| 2 | Consistency | "Preview Wall" button opens in same tab | **Already implemented** — code has `target="_blank" rel="noopener noreferrer"` | Minor |
| 3 | Empty States | If all slide types are unchecked, the public wall shows "Announcement Wall is not configured yet" — this is good but could suggest enabling slides | Add a link or suggestion: "Enable slide types in your event settings" | Minor |
| 4 | Visual Polish | Next.js dev tools "N" button overlaps the bottom-left event title on the public wall | Dev-only issue, no action needed for production | Minor |

## What's Working Well

- Full-screen wall display with `fixed inset-0 z-50` effectively covers the public layout chrome
- Clean dark theme with proper contrast, readable typography, and good visual hierarchy
- QR code generation works correctly with transparent background matching the theme
- Slide counter (1/5) and event title in the bottom bar provide useful context
- Toggle-based slide type configuration is intuitive and matches the design spec
- Custom slide CRUD (create, edit, delete) all work correctly
- Date formatting handles multi-day events well ("Sep 11-12, 2026")
- Location displays correctly from `location_data.venue_name`
- 60-second auto-refresh via `WallRefreshWrapper` keeps data live without full page reload
- Config page correctly persists state — toggling Live Polls on and saving was reflected on reload

## Recommended Next Steps

1. Consider opening Preview Wall in a new tab (minor)
2. Add color indicator to custom slide list items (minor — already shows color swatch)

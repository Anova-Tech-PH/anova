# UX Evaluation Report: Documents & Videos

**Date:** 2026-08-13
**Tested by:** Claude (Playwright MCP)
**Page(s) tested:**
- `/events/[eventId]/documents` (Documents)
- `/events/[eventId]/documents/video-hosting` (Video Hosting - Coming Soon)
- `/events/[eventId]/documents/attendee-video-access` (Attendee Video Access - Coming Soon)

## Summary

The Documents & Videos feature is well-structured with a clean two-section layout (Event documents / Session documents) matching Whova's pattern. One critical bug was found and fixed: the edit form was not pre-filling with existing document data. All major and most minor issues have been resolved.

## Critical Issues (fix before release)

| # | Heuristic | Issue | Recommendation | Status |
|---|-----------|-------|----------------|--------|
| 1 | Error Prevention | Edit form fields were empty -- title, file URL, file type not pre-filled when editing a document. `useState` initializers only capture the prop at mount time. | Added `useEffect` to sync form state when `open`/`document` props change. | FIXED |

## Major Issues (fix soon)

| # | Heuristic | Issue | Recommendation | Status |
|---|-----------|-------|----------------|--------|
| 1 | Empty States | Empty state for "Event documents" and "Session documents" sections lack a CTA button to upload the first document. | Added "Upload document" button with Plus icon inside both empty state boxes. | FIXED |
| 2 | Information Display | "test-session-doc" shows raw MIME type "text/plain" in the Type column instead of a human-readable label. | Added `friendlyFileType()` helper with MIME-to-label mapping (PDF, PowerPoint, Excel, Word, Text, CSV, Image). | FIXED |

## Minor Issues (nice to have)

| # | Heuristic | Issue | Recommendation | Status |
|---|-----------|-------|----------------|--------|
| 1 | Consistency | The "Upload docs and slides" button label doesn't match the form title "Add Document". | Changed form title from "Add Document" to "Upload Document" to match button. | FIXED |
| 2 | Visual Hierarchy | The stats bar only shows total document count. Could show event vs session breakdown. | -- | Open |
| 3 | Accessibility | Edit/Delete hover actions are invisible until hover -- not keyboard accessible and not discoverable on touch devices. | Consider always showing actions on mobile, or adding a kebab menu. | Open |
| 4 | Form UX | Sort Order and File Type fields are exposed to all users but are technical concepts. | Moved Sort Order and File Type behind collapsible "Advanced options" toggle. | FIXED |

## What's Working Well

- Two-section layout (Event documents / Session documents) clearly separates content with good descriptions
- Sidebar navigation with expandable "Documents & Videos" parent and 3 sub-pages works correctly
- Hover-to-reveal Edit/Delete actions keep the table clean
- Delete confirmation dialog with clear warning text prevents accidental deletion
- Stats bar showing document count provides quick overview
- Coming Soon pages for Video Hosting and Attendee Video Access are consistent with other placeholder pages (Speaker Center pattern)
- Form correctly toggles between File and Video fields based on type selection
- Session attachment dropdown includes all event sessions
- MIME types now display as friendly labels (PDF, Text, Word, etc.)
- Empty states include CTA buttons guiding users to upload
- Form is shorter by default with advanced options hidden
- No console errors on any page

## Functional Test Results

| Test | Result |
|------|--------|
| Page loads without errors | PASS |
| All sections render correctly | PASS |
| Stats bar shows correct count (3) | PASS |
| Event documents table displays 3 docs | PASS |
| Session documents shows empty state with CTA | PASS |
| MIME types show friendly labels (Text, File, Video) | PASS |
| Hover reveals Edit/Delete buttons | PASS |
| Edit button opens form | PASS |
| Edit form pre-fills data | PASS |
| Cancel closes form without changes | PASS |
| Delete shows confirmation dialog | PASS |
| Cancel on delete dialog works | PASS |
| "Upload docs and slides" opens Upload form | PASS |
| Upload form title says "Upload Document" | PASS |
| Advanced options toggle shows/hides File Type + Sort Order | PASS |
| Upload form has empty fields and disabled Create button | PASS |
| Video Hosting Coming Soon page renders | PASS |
| Attendee Video Access Coming Soon page renders | PASS |
| Sidebar sub-navigation highlights active page | PASS |
| No console errors | PASS |

## Screenshots

- [Documents page (after fixes)](screenshots/documents-page-fixed.png)
- [Hover actions](screenshots/documents-hover-actions.png)
- [Edit form (before fix - empty)](screenshots/documents-edit-form.png)
- [Edit form (after fix - pre-filled)](screenshots/documents-edit-form-fixed.png)
- [Upload form (shorter, with advanced toggle)](screenshots/documents-upload-form-fixed.png)
- [Upload form (advanced expanded)](screenshots/documents-form-advanced.png)
- [Delete confirmation](screenshots/documents-delete-confirm.png)
- [Video Hosting Coming Soon](screenshots/video-hosting-page.png)
- [Attendee Video Access Coming Soon](screenshots/attendee-video-access-page.png)

## Recommended Next Steps

1. ~~Fix edit form pre-fill bug~~ DONE
2. ~~Add CTA buttons in empty states~~ DONE
3. ~~Map MIME types to friendly labels~~ DONE
4. ~~Align terminology (Upload vs Add)~~ DONE
5. ~~Hide Sort Order/File Type behind advanced toggle~~ DONE
6. Consider adding stats breakdown (event vs session doc count)
7. Improve mobile/touch accessibility for row actions

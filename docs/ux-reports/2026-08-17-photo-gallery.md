# UX Evaluation Report: Photo Gallery Feature

**Date:** 2026-08-17
**Tested by:** Claude (Playwright MCP)
**Pages tested:**
- `http://localhost:3000/events/{eventId}/photos` (Organizer Photo Collection)
- `http://localhost:3000/events/{eventId}/photos/booth` (Organizer Photo Booth Frames)
- `http://localhost:3000/events/{eventId}/photos/profile-frames` (Organizer Profile Photo Frames)
- `http://localhost:3000/{org}/{event}/photos` (Public Photo Gallery)
- `http://localhost:3000/{org}/{event}/profile` (Attendee Profile + Frame Picker)

## Summary

The photo gallery feature is functionally solid with a well-designed multi-step upload flow, working comments, likes, social sharing, and frame selection. Three critical bugs were found and fixed during testing (build-breaking import errors and missing Next.js image config). Several UX polish items remain.

## Critical Issues (fixed during testing)

| # | Issue | Fix | File |
|---|-------|-----|------|
| 1 | `export { FRAME_TEMPLATES }` in `"use server"` file caused 500 on all organizer pages | Removed non-async re-export | `photo-booth/queries.ts:7` |
| 2 | `Facebook` and `Linkedin` icons removed from `lucide-react` v1.23.0, caused 500 on public photos page | Replaced with custom SVG components | `photos/components/social-share.tsx` |
| 3 | `next/image` rejects `127.0.0.1` hostname for Supabase storage URLs | Added `remotePatterns` for `127.0.0.1:54331` and `localhost:54331` | `next.config.ts` |

## Major Issues (fix soon)

| # | Heuristic | Issue | Recommendation | Severity |
|---|-----------|-------|----------------|----------|
| 1 | Visibility of System Status | After uploading a photo and clicking "Done", the gallery still shows the old empty state text ("No photos yet") even though the count updated to "1 photo". The uploaded photo only appears after a full page reload. | The `UploadPhotoDialog` should trigger a client-side refresh of the photo list after upload (e.g., call a `refreshPhotos` callback passed from `PhotoGallery`). | Major |
| 2 | Post-Action Navigation | Comment author shows as "Attendee" instead of the user's display name. The `getPhotoComments` query doesn't join the `attendee_profiles` table to fetch the commenter's name. | Join `attendee_profiles` in the comments query to populate `author_name`. | Major |

## Minor Issues (nice to have)

| # | Heuristic | Issue | Recommendation | Severity |
|---|-----------|-------|----------------|----------|
| 1 | Visibility of System Status | Profile frame section doesn't show which frame is currently active after applying one. Button still says "Add Photo Frame" with no visual indicator. | Show the active frame name/color next to the button, or change button text to "Change Photo Frame" when one is set. | Minor |
| 2 | Consistency | Upload dialog "Share a Photo" title vs button text "Share a photo" — inconsistent casing. | Use consistent title casing. | Minor |
| 3 | Information Density | Photo detail modal comment section is compact but the comment input submit button icon-only (Send icon) may be unclear to some users. | Consider adding "Post" text label next to the Send icon, or use a tooltip. | Minor |
| 4 | Empty States | Photo gallery empty state ("No photos yet. Be the first to share!") doesn't include a direct CTA button. Users must find the "Share a photo" button in the header. | Add a "Share a photo" button in the empty state area. | Minor |

## What's Working Well

- **Upload flow**: The 4-method upload selection (Choose Photos, Drag & Drop, Paste Clipboard, Take a Selfie) is intuitive and well-organized as a 2x2 grid
- **Frame selection**: Frame selector in preview step works smoothly, showing available booth frames with clear selection state
- **Social sharing**: Post-upload sharing step with Facebook, X, LinkedIn, Copy Link, and native Web Share API works correctly
- **Photo detail modal**: Clean layout with photo on left, metadata/comments on right. Keyboard navigation (Escape to close, arrow keys for multi-photo) works
- **Deep linking**: URL updates with `?photo={id}` when viewing a photo, enabling shareable links
- **Like system**: Optimistic UI update (0 -> 1 instantly) with proper server sync
- **Comments**: Optimistic comment insertion with character counter (0/140) and Enter-to-submit
- **Organizer photo collection**: Stats header (Photos/Videos/Likes counts), tab filters, per-photo actions (delete, download, checkbox for bulk)
- **Organizer frame CRUD**: Create/edit/delete booth frames and profile photo frames works end-to-end
- **Profile frame picker**: Clean dialog with frame preview grid, No Frame option, Cancel/Apply buttons

## Recommended Next Steps

1. Fix gallery not refreshing after upload (Major #1) — add `refreshPhotos` callback
2. Fix comment author name (Major #2) — join `attendee_profiles` in `getPhotoComments`
3. Show active profile frame state (Minor #1)
4. Add empty state CTA button (Minor #4)
5. Restart dev server to verify `next.config.ts` image patterns work (config changes require restart)

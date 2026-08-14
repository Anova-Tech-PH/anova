# Whova vs Attendly: Public Website Gap Analysis

**Date:** 2026-08-14
**Scope:** Attendee-facing public event web app (not organizer dashboard)

---

## Navigation Structure Comparison

### Whova Sidebar (Attendee Web App)
| Nav Item | Badge/Count | Notes |
|----------|-------------|-------|
| Home | - | Event hero + activity feed |
| Agenda > Sessions | - | Full/My Agenda tabs, search, day tabs |
| Agenda > Speakers | - | Nested under Agenda |
| Attendees | 3 (badge) | Directory with Recommended/Bookmarked/Categories tabs |
| Community | 1.3k (badge) | Discussion topics, meetups, icebreakers |
| Messages | 11 (badge) | Private 1-1 and group messaging |
| Photos | - | Event photo gallery with likes |
| Win a Prize > | - | Gamification challenges/contests |
| Leaderboard | - | Points ranking + challenge list |
| Resources > | - | Session Q&A, documents, past Q&A |
| My Stuff > | - | Personal agenda, notes, bookmarks, profile |

### Attendly Sidebar (Public Event App)
| Nav Item | Badge/Count | Notes |
|----------|-------------|-------|
| Event | - | Event hero + about + schedule preview |
| Schedule | - | Session list grouped by day |
| Speakers | - | Speaker grid |
| Rooms | - | Breakout rooms |
| Resources | - | Documents & videos |
| Sponsors | - | Sponsor booths by tier |
| Announcements | - | Announcement feed |
| Certificate | - | Download attendance certificate |
| Logistics | - | Venue, parking, hotels, WiFi, contacts |
| Website | - | Custom event website |
| Register | - | Ticket selection + registration form |

---

## Feature-by-Feature Gap Analysis

### MISSING FROM ATTENDLY (Whova has, we don't)

#### Critical Gaps (High Impact)

| # | Feature | Whova Implementation | Impact | Priority |
|---|---------|---------------------|--------|----------|
| 1 | **Attendee Directory** | Browseable attendee list with photos, titles, companies. Tabs: All, Recommended, Bookmarked, Categories. Search by name/affiliation/location. Actions: Bookmark, View Profile, Say Hi (message). 749 attendees visible. | Networking is #1 reason attendees use event apps. Without this, attendees can't discover each other. | P0 |
| 2 | **Private Messaging** | 1-1 and group chat between attendees. Badge shows unread count (11). Initiated from attendee profiles or "Say Hi" button. | Core networking feature. 7,596 messages exchanged at GHS event. Without messaging, attendee directory is read-only. | P0 |
| 3 | **Personal Agenda ("My Agenda")** | Attendees add sessions to personal schedule via "Add to My Agenda" button on each session. Separate "My Agenda" tab filters to bookmarked sessions only. Export personal agenda. | Attendees curate their own schedule from hundreds of sessions. 258 attendees used this at GHS. We have bookmark icons but no dedicated "My Agenda" view. | P1 |
| 4 | **Activity Feed (Home)** | Homepage shows real-time activity: announcements, photos shared, community posts. Social-media-like feed with likes and timestamps. | Creates a sense of community and FOMO. Shows the event is alive. Our homepage is static (hero + about + schedule preview). | P1 |
| 5 | **Session Search & Filtering** | Search bar: "Search by session name, location, speaker, or author". Day tabs with left/right navigation for multi-day events. | Essential for events with 50+ sessions. Our schedule page has no search or filter. | P1 |
| 6 | **Session Notes** | "Add notes" button on every session card. Notes are private, exportable via email. Also available on attendee profiles. | Attendees capture insights during talks. Export feature makes notes useful beyond the event. | P2 |
| 7 | **Community Board** | Discussion topics with follow/unfollow. Tabs: All Topics, Followed, New Topics. Self-organized meetups, rideshares, job postings, icebreakers, lost & found. 3,216 posts + 1.3k topics at GHS. | Major engagement driver. Attendees self-organize without organizer intervention. | P2 |
| 8 | **Photos** | Event photo gallery where attendees upload and share photos. Like button, go-to-gallery links. Photos appear in activity feed. 996 photos at GHS. | Visual memories and social sharing. Creates shareable content. | P2 |
| 9 | **Gamification / Leaderboard** | Points system with challenges: answer polls (5k pts), add topics (20k pts), suggest meetups (20k pts), post Q&A questions (10k pts), add sessions to agenda (300 pts). Current rankings with congratulate button. "Win a Prize" section. | Drives engagement across ALL features. Top user had 223,500 points. Creates competition and motivation. | P2 |
| 10 | **Session Q&A** | Attendees post questions during/after sessions. Upvote questions to prioritize. Accessible from session detail and Resources section. | Interactive session participation. Speakers can address top-voted questions. | P2 |

#### Medium Gaps (Nice to Have)

| # | Feature | Whova Implementation | Impact |
|---|---------|---------------------|--------|
| 11 | **Attendee Recommendations** | "Recommended" tab in attendee directory. Whova suggests people to network with based on profile/interests. | AI-powered networking suggestions |
| 12 | **Attendee Bookmarking** | Save attendees for later. "Bookmarked" tab shows saved profiles. | Quick reference for follow-up |
| 13 | **Attendee Categories Tab** | Filter attendee directory by category (VIP, Speaker, General, etc.) | We have categories in DB but no public-facing filter |
| 14 | **My Stuff Section** | Personal hub: my agenda, my notes, my bookmarks, my profile, export. Collapsible sidebar section. | Centralized personal dashboard |
| 15 | **Event Time Toggle** | "Switch to event time" / "Switch to local time" button in header. Shows "Displaying in your local time: 2:30 PM" or event timezone. | Essential for virtual/international attendees |
| 16 | **View Map Link** | "View map" link next to location in event header. Opens venue location. | Quick venue navigation |
| 17 | **Mobile App Download Prompt** | "This event is also available on the Whova Mobile App: Download Link" on homepage. | Drives mobile app adoption |
| 18 | **Speed Networking** | Timed rotating video chatrooms for random attendee matching. | Premium networking feature |
| 19 | **1-1 Meeting Scheduler** | Attendees can schedule private meetings with time slot selection. | Business networking |

---

### WHAT ATTENDLY HAS THAT WHOVA DOESN'T (Our Advantages)

| # | Feature | Attendly Implementation | Advantage |
|---|---------|------------------------|-----------|
| 1 | **Sponsor Booths** | Rich sponsor detail pages with promo videos, documents, coupons, booth chat, lead capture, visit tracking. | More comprehensive sponsor experience than Whova's basic exhibitor listing |
| 2 | **Certificate Download** | Public certificate page with eligibility check (check-in count), PDF generation. | Whova has certificates but handled differently (organizer-generated) |
| 3 | **Logistics Center** | Detailed logistics: venue description, Google Maps embed, parking, transportation, WiFi credentials, hotels with rates, contacts, custom sections. | More structured than Whova's basic logistics |
| 4 | **Breakout Rooms** | Public rooms page showing breakout room cards with status, facilitator, capacity, time. | Unique feature for workshop-style events |
| 5 | **Custom Event Website** | Full website renderer with configurable sections. | More flexible than Whova's basic event page |
| 6 | **Session RSVP with Capacity** | RSVP buttons (confirm/decline/tentative) with capacity tracking directly on schedule. | More granular than Whova's "Add to My Agenda" |
| 7 | **Live Polls in Schedule** | Polls embedded directly in session cards on the schedule page. | Inline rather than separate section |
| 8 | **Session Feedback** | Feedback forms appear on session cards after session ends. | Contextual rather than separate |
| 9 | **Registration Flow** | Full ticket selection + promo codes + custom fields + QR confirmation. All in-app. | Whova uses external registration or their own ticketing |

---

### WHAT SHOULD BE REMOVED OR RECONSIDERED IN ATTENDLY

| # | Item | Current State | Recommendation |
|---|------|--------------|----------------|
| 1 | **"Website" nav item** | Links to a custom website renderer page. But the entire public app IS the event website. | Confusing — attendees don't understand the difference between the event app and the "website" page. Consider: rename to "Custom Page" or remove if rarely used. Merge website content into the main Event page. |
| 2 | **"Rooms" nav item** | Shows breakout rooms. Only relevant if organizer creates breakout rooms (rare). | Hide from sidebar when no rooms exist. Don't show empty pages. |
| 3 | **"Resources" nav item** | Shows documents and videos. Empty if organizer hasn't uploaded anything. | Hide from sidebar when no resources exist. |
| 4 | **"Certificate" nav item** | Always visible even if certificates aren't configured. | Hide when certificate feature is not enabled for the event. |
| 5 | **"Logistics" nav item** | Always visible even if no logistics info is configured. | Hide when no logistics data exists. |
| 6 | **Static homepage** | Hero + about + speakers preview + schedule preview. No dynamic content. | Add an activity feed or recent announcements to make it feel alive. |
| 7 | **No notification badges** | Sidebar shows no counts or badges for any section. | Add badges for unread announcements, new community posts, etc. (like Whova's red badges). |
| 8 | **All 11 nav items always visible** | Every nav item shows regardless of whether that section has content. | Dynamically hide nav items for sections with no content. Only show what's relevant. |

---

## Side-by-Side Visual Comparison

### Homepage
| Aspect | Whova | Attendly |
|--------|-------|----------|
| Layout | Event hero (left) + Activity Feed (right) | Event hero (full width) + static sections |
| Dynamic content | Real-time activity feed with photos, announcements, likes | None — fully static |
| Social proof | Activity from real attendees visible immediately | Only attendee count shown |
| Event header | Sticky orange bar with logo, location, dates, timezone, map link | Clean hero with org badge, title, dates, venue |
| Design | Functional but dated (2015-era design) | Modern, clean, well-spaced |

### Schedule/Agenda
| Aspect | Whova | Attendly |
|--------|-------|----------|
| Search | Full search bar (name, location, speaker, author) | None |
| Tabs | Full Agenda / My Agenda toggle | None |
| Day navigation | Horizontal day tabs with arrows for scrolling | Day headers (no tabs, just scroll) |
| Session actions | View details, Add notes, Add to My Agenda | Bookmark icon only |
| Speaker display | Not shown on list view (in details) | Speaker avatar + name shown inline |
| Session types | Not tagged on list | Color-coded type badges (keynote, talk, break) |

### Attendee Directory
| Aspect | Whova | Attendly |
|--------|-------|----------|
| Exists? | Yes — full directory | **NO** — completely missing |
| Search | By name, affiliation, location | N/A |
| Tabs | All, Recommended, Bookmarked, Categories | N/A |
| Profile cards | Photo, name, title, company, actions | N/A |
| Actions | Bookmark, View Profile, Say Hi (message) | N/A |
| Alphabetical grouping | Yes (A, B, C...) | N/A |
| Total count | "749 attendees total" shown | N/A |

---

## Priority Recommendations

### P0 — Must Build (Core Value Prop Gaps)
1. **Attendee Directory** — Browseable, searchable attendee list with profiles
2. **Private Messaging** — 1-1 chat between attendees from directory

### P1 — Should Build (Key UX Gaps)
3. **My Agenda View** — Dedicated "My Schedule" page filtering to bookmarked sessions
4. **Session Search & Filter** — Search bar + day tabs on schedule page
5. **Activity Feed** — Dynamic homepage with recent activity (announcements, photos)
6. **Dynamic Sidebar** — Hide empty sections, add notification badges

### P2 — Build for Engagement Parity
7. **Community Board** — Discussion topics with follow/create
8. **Photos** — Event photo gallery with upload/like
9. **Session Q&A** — Question submission + upvoting per session
10. **Session Notes** — Private note-taking with export
11. **Gamification** — Points, challenges, leaderboard

### Quick Wins (Low Effort, High Impact)
- Hide empty nav items (Rooms, Resources, Certificate, Logistics when no data)
- Add timezone display/toggle in event header
- Add "View Map" link next to venue
- Add notification badges to sidebar (unread announcements count)
- Add search bar to schedule page

---

## Summary

**Attendly's strengths:** Modern design, sponsor booths, logistics detail, session RSVP/polls/feedback inline, certificate system, registration flow.

**Attendly's critical gap:** No attendee networking features at all. No attendee directory, no messaging, no community board. This is where Whova generates the most value (7,596 messages, 3,216 community posts, 54 meetups at one event).

**Attendly's UX gap:** Static homepage with no activity feed, no session search, always-visible empty nav items, no personal agenda view.

**Design advantage:** Attendly looks significantly more modern than Whova (which has a dated 2015-era UI). If we add the networking/engagement features with our modern design, we'll have a stronger product.

Sources:
- [Whova App User Guide](https://whova.com/pages/whova-app-user-guide/)
- [Whova Event App Features](https://whova.com/whova-event-app/)
- [Whova Attendee Guide](https://whova.com/pages/attendee-guide/)
- [Whova Review 2026 (flat.social)](https://flat.social/guides/whova-review)
- [EventsAir Whova Review](https://www.eventsair.com/blog/whova-event-management-software-review)

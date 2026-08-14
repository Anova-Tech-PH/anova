# Attendly Public Event App — Whova Parity Design

**Goal:** Transform the Attendly public event pages from a static event website into an interactive attendee portal matching Whova's attendee web app.

**Architecture:** Build all features into `apps/web` public event pages. Auto-create Supabase Auth accounts on registration. Add sticky event header, dynamic sidebar, and full networking/engagement features. Gamification is "Coming Soon" placeholder.

**Tech Stack:** Next.js 16, React 19, Supabase (Auth, Realtime, Storage, RLS), Tailwind 4

---

## Decisions

| Decision | Choice |
|----------|--------|
| Scope | Full Whova parity (P0-P2), gamification as Coming Soon |
| Account creation | Auto-create on registration + "set password" email |
| Attendee profiles | Name, photo, title, company, location, bio, interests, affiliations |
| Messaging | Lightweight "Say Hi" from profiles, inbox under My Stuff |
| Community Board | Full parity: all topic types, icebreaker, follow, tabs, search |
| Event header | Sticky banner bar with event name, location, dates, timezone toggle |

---

## New Sidebar Structure

```
[Sticky Event Header: logo + name + location + dates + timezone toggle]

Home                    -> Activity feed + event hero
Agenda >
  Sessions              -> Search + day tabs + Full/My Agenda + Add notes
  Speakers              -> Speaker grid (moved under Agenda)
Attendees [badge]       -> Directory: All / Recommended / Bookmarked / Categories
Community [badge]       -> Topics: All / Following / By Organizers / New + icebreaker
Photos                  -> Gallery with upload, like, photo/video tabs
Session Q&A             -> Per-session questions with upvote
Sponsors                -> Sponsor booths (existing)
Resources               -> Documents & videos (existing, hidden if empty)
Logistics               -> Venue info (existing, hidden if empty)
Register                -> Registration flow (existing)
---
My Stuff >
  My Agenda             -> Bookmarked sessions view
  My Notes              -> Session notes with export
  Messages              -> Conversation threads
  Profile               -> Edit profile info + interests
Certificate             -> (existing, hidden if not enabled)
Sign out / Sign in
```

---

## Database Schema

### New Tables

```sql
-- Attendee profiles (extends auth.users with public-facing info)
attendee_profiles (
  id UUID PK (= auth.users.id),
  event_id UUID FK -> events,
  display_name TEXT,
  avatar_url TEXT,
  title TEXT,
  company TEXT,
  location TEXT,
  bio TEXT,
  is_visible_in_directory BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Private messages ("Say Hi")
direct_messages (
  id UUID PK,
  event_id UUID FK -> events,
  sender_id UUID FK -> auth.users,
  recipient_id UUID FK -> auth.users,
  content TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)

-- Community board topics
community_topics (
  id UUID PK,
  event_id UUID FK -> events,
  author_id UUID FK -> auth.users,
  title TEXT,
  type TEXT ('discussion' | 'announcement' | 'meetup' | 'ask_organizer'),
  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Community topic posts (replies)
community_posts (
  id UUID PK,
  topic_id UUID FK -> community_topics,
  author_id UUID FK -> auth.users,
  content TEXT,
  created_at TIMESTAMPTZ
)

-- Topic follows
community_topic_follows (
  user_id UUID FK -> auth.users,
  topic_id UUID FK -> community_topics,
  PRIMARY KEY (user_id, topic_id)
)

-- Icebreaker config
event_icebreakers (
  id UUID PK,
  event_id UUID FK -> events,
  question TEXT,
  options JSONB,
  enabled BOOLEAN DEFAULT true
)

-- Icebreaker responses
icebreaker_responses (
  id UUID PK,
  event_id UUID FK -> events,
  user_id UUID FK -> auth.users,
  introduction TEXT,
  answer TEXT,
  created_at TIMESTAMPTZ
)

-- Event photos
event_photos (
  id UUID PK,
  event_id UUID FK -> events,
  user_id UUID FK -> auth.users,
  image_url TEXT,
  media_type TEXT ('photo' | 'video'),
  caption TEXT,
  likes_count INT DEFAULT 0,
  created_at TIMESTAMPTZ
)

-- Photo likes
photo_likes (
  user_id UUID FK -> auth.users,
  photo_id UUID FK -> event_photos,
  PRIMARY KEY (user_id, photo_id)
)

-- Session Q&A questions
session_questions (
  id UUID PK,
  session_id UUID FK -> sessions,
  user_id UUID FK -> auth.users,
  content TEXT,
  upvotes_count INT DEFAULT 0,
  is_answered BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ
)

-- Session Q&A upvotes
question_upvotes (
  user_id UUID FK -> auth.users,
  question_id UUID FK -> session_questions,
  PRIMARY KEY (user_id, question_id)
)

-- Session notes (private)
session_notes (
  id UUID PK,
  session_id UUID FK -> sessions,
  user_id UUID FK -> auth.users,
  content TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(session_id, user_id)
)

-- Attendee bookmarks (bookmarking other attendees)
attendee_bookmarks (
  user_id UUID FK -> auth.users,
  bookmarked_user_id UUID FK -> auth.users,
  event_id UUID FK -> events,
  PRIMARY KEY (user_id, bookmarked_user_id, event_id)
)

-- Activity feed events
activity_feed (
  id UUID PK,
  event_id UUID FK -> events,
  user_id UUID FK -> auth.users,
  type TEXT ('announcement' | 'photo' | 'community_post' | 'meetup'),
  reference_id UUID,
  created_at TIMESTAMPTZ
)
```

### Existing Tables Reused
- `session_bookmarks` -> "My Agenda" (already exists)
- `announcements` -> merged into community board as topic type
- `event_interests` / `attendee_interests` -> profile interests (migration 071)
- `attendee_categories` -> directory Categories tab (migration 069)

### Modified Tables
- `registrations` -> auto-create auth user on insert, link `user_id`

---

## Feature Details

### 1. Auto-Account Creation on Registration
- `registerForEvent` action: after creating registration, call `supabase.auth.admin.createUser({ email, email_confirm: true })` with service role
- Send "Set your password" email via Supabase `sendPasswordResetEmail`
- Create default `attendee_profile` from registration data (name -> display_name, company, title)
- If user already exists (email match), just link `user_id`

### 2. Sticky Event Header Bar
- Positioned above main content area, below mobile top bar
- Shows: event logo/icon, event name (truncated), location with "View map" link, date range, timezone toggle
- Timezone toggle stores preference in localStorage, affects all time displays
- Desktop: full bar. Mobile: condensed (name + dates only)

### 3. Dynamic Sidebar
- Query event data server-side: count resources, logistics, rooms, community posts, unread items
- Hide nav items when section has zero content (Resources, Rooms, Logistics, Certificate)
- Show red notification badges: Community (new post count), Attendees (new since last visit)
- Collapsible "Agenda >" with Sessions + Speakers sub-items
- Collapsible "My Stuff >" with My Agenda, My Notes, Messages, Profile
- Unauthenticated users: hide My Stuff, show "Sign in" at bottom

### 4. Attendee Directory
- **All tab**: Alphabetical grid of attendee cards (photo, name, title, company). Paginated.
- **Recommended tab**: Match by shared interests (`event_interests`/`attendee_interests`). Most overlap first.
- **Bookmarked tab**: Attendees you've bookmarked.
- **Categories tab**: Filter by `attendee_categories`.
- Search bar: name, company, title, location.
- Card actions: Bookmark, View Profile, Say Hi.
- Profile detail page: full bio, affiliations, interests, location, "Send Message" button.

### 5. "Say Hi" Messaging
- "Say Hi" opens inline message composer (modal)
- Creates `direct_messages` row. Recipient sees notification badge.
- Messages accessible from "My Stuff > Messages" as inbox: conversation threads grouped by person, newest first
- Real-time via Supabase Realtime subscription on `direct_messages`

### 6. Community Board
- **Tabs**: All Topics, Following, By Organizers, New
- **Built-in topic types**:
  - "Organizer Announcements" (auto-created, organizer posts only, pinned)
  - "Meet-ups & Virtual Meets" (attendees create meetups with date/time/location)
  - "Ask Organizers Anything" (auto-created, attendees ask, organizers answer)
  - Free-form discussion topics (anyone creates)
- **Features**: Follow/unfollow, reply, search topics, "Add new topic" button, new post count badges
- **Icebreaker popup**: On first visit, modal asks introduction + icebreaker question (configured by organizer). Skip or Post. Response appears in pinned "Introductions" topic.

### 7. Photo Gallery
- Tabs: All Media, Photos (count), Videos (count)
- Grid layout with attendee name + like count overlay
- Upload: photo or short video (Supabase Storage)
- Like button with optimistic update
- Total post count in header

### 8. Session Q&A
- Page listing sessions with active Q&A
- Search by session name or speaker
- Sections: "Sessions from My Agenda" (bookmarked), "Other sessions"
- "View questions" -> session Q&A detail: questions sorted by upvotes
- Post question form, upvote button (one per user per question)

### 9. My Agenda
- Same layout as schedule but filtered to bookmarked sessions
- "Go to full agenda" button top-right
- Search bar + day tabs
- Empty state: "No Sessions found" with illustration

### 10. Session Notes
- "Add notes" button on each session card (schedule page)
- Inline textarea, auto-saves on blur
- My Notes page: all notes across sessions, "Export" button sends to email

### 11. Profile Page
- Edit: name, photo (upload), title, company, location, bio
- Manage affiliations (add/edit/remove with date ranges)
- Select interests from event's `event_interests`
- Toggle directory visibility

### 12. Activity Feed (Home)
- Replace static homepage with dynamic feed
- Feed items: announcements, photos shared, community posts, meetups
- Each item: author avatar + name, timestamp, content preview, like/view actions
- Event hero stays at top, feed below

### 13. Gamification — Coming Soon
- Leaderboard page shows "Coming Soon" placeholder with illustration
- Brief description of what it will offer

---

## Access Control

| Feature | Anonymous | Logged In |
|---------|-----------|-----------|
| View event, schedule, speakers, sponsors | Yes | Yes |
| View announcements, resources, logistics | Yes | Yes |
| Register for event | Yes | Yes |
| Session Q&A (view questions) | Yes | Yes |
| View attendee directory | No | Yes |
| Bookmark attendees / Say Hi | No | Yes |
| Community board (read + write) | No | Yes |
| Photo gallery (view + upload + like) | No | Yes |
| Session Q&A (post + upvote) | No | Yes |
| Bookmark sessions / RSVP / Vote | No | Yes |
| My Agenda / My Notes / Messages / Profile | No | Yes |

Content pages stay public. Interactive/social features require login. Auto-account creation on registration means most attendees already have accounts.

---

## Whova Reference Screenshots

Captured from Global Harvest Summit 2025 attendee web app:
- Home: Activity feed + event hero (whova-attendee-webapp-home.png)
- Agenda: Search + day tabs + "Add to My Agenda" + "Add notes" (whova-attendee-agenda.png)
- Attendees: Directory with All/Recommended/Bookmarked/Categories tabs (whova-attendee-directory.png)
- Community: Topics with tabs + icebreaker popup (whova-community-board.png, whova-community-board-list.png)
- Photos: Gallery with upload/like + photo contest (whova-photo-gallery.png)
- Session Q&A: Session list with question counts (whova-session-qa.png)
- Leaderboard: Rankings + challenge list (whova-attendee-leaderboard.png)
- My Agenda: Personal schedule with search + day tabs (whova-my-agenda.png)
- Profile: Name, photo, affiliation, education, location, interests (whova-profile.png)

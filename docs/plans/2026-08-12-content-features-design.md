# Content Features Design — Full Whova Parity

**Goal:** Close the content gap between Attendly and Whova by implementing 7 features across two phases.

**Phasing:**
- **Phase A** — Content Consumption: Speaker Manager Enhancement, Agenda Import/Export, Session Q&A, Documents & Videos
- **Phase B** — Business & Operations: Exhibitor/Sponsor Center, Event Website Builder, Logistics Page

---

## Phase A: Content Consumption

### A1. Speaker Manager Enhancement

**Current state:** Basic CRUD (name, title, company, bio, photo, email) with session linking via `session_speakers`.

**Schema changes** (extend `speakers` table):
- `linkedin_url` TEXT
- `twitter_handle` TEXT
- `website_url` TEXT
- `is_featured` BOOLEAN DEFAULT false
- `sort_order` INT DEFAULT 0

**Features:**
- Social links on speaker cards and detail page
- Featured flag for highlighting keynote speakers
- Manual sort order
- Public speaker detail page: `/[orgSlug]/[eventSlug]/speakers/[speakerId]` — full bio, photo, social links, linked sessions
- Organizer bulk import via CSV (name, title, company, bio, email, linkedin, twitter, website)
- Speaker photo gallery with track filter on public page

---

### A2. Agenda Import/Export

**No new tables.** Operates on existing `sessions`, `tracks`, `speakers`, `session_speakers`.

**Import:**
- CSV upload with column mapping UI (title, description, type, track, start_time, end_time, location, speaker names)
- Preview table before confirming import
- Auto-create tracks and speakers referenced in CSV if they don't exist
- Duplicate detection by title + start_time

**Export:**
- CSV export of all sessions
- iCal (.ics) export — full event calendar file
- Per-session "Add to Calendar" button on public pages (generates .ics for single session)

---

### A3. Session Q&A

**New tables:**

```sql
CREATE TABLE session_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'answered')),
  is_anonymous BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  upvote_count INT DEFAULT 0,
  answer_text TEXT,
  answered_by UUID REFERENCES auth.users(id),
  answered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE question_upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES session_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(question_id, user_id)
);
```

**Session-level toggles** (add to `sessions` table):
- `qa_enabled` BOOLEAN DEFAULT false
- `qa_moderation_enabled` BOOLEAN DEFAULT false
- `qa_anonymous_enabled` BOOLEAN DEFAULT true

**Features:**
- Attendees submit questions during/before sessions
- Optional moderation queue (per session toggle)
- Upvoting (one per user per question, unique constraint)
- Speakers/organizers mark as "answered" with optional reply
- Pin important questions to top
- Anonymous question support (per session toggle)
- Real-time updates via Supabase Realtime subscriptions
- Organizer dashboard: moderation queue, bulk approve/reject

---

### A4. Documents & Videos

**New tables:**

```sql
CREATE TABLE event_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('file', 'video')),
  file_url TEXT,
  external_url TEXT,
  file_size BIGINT,
  file_type TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE document_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES event_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Features:**
- Organizer: upload files (PDF, PPTX, DOCX, images) or paste video URLs (YouTube/Vimeo)
- Attach to event (central library) or specific session
- Public "Resources" page: `/[orgSlug]/[eventSlug]/resources` — all event-level documents grouped by type
- Session detail shows attached documents/videos
- Video embed player for YouTube/Vimeo URLs
- Download tracking with analytics

---

## Phase B: Business & Operations

### B1. Exhibitor/Sponsor Center

**New tables:**

```sql
CREATE TABLE sponsor_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  logo_size TEXT DEFAULT 'medium' CHECK (logo_size IN ('large', 'medium', 'small')),
  benefits JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tier_id UUID REFERENCES sponsor_tiers(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  logo TEXT,
  description TEXT,
  website_url TEXT,
  promo_video_url TEXT,
  booth_enabled BOOLEAN DEFAULT false,
  contact_email TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sponsor_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sponsor_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT,
  discount_value NUMERIC NOT NULL,
  discount_type TEXT DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  valid_until TIMESTAMPTZ,
  max_uses INT,
  current_uses INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sponsor_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  job_title TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sponsor_id, user_id)
);

CREATE TABLE booth_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_from_sponsor BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE booth_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sponsor_id, user_id)
);
```

**Organizer features:**
- CRUD for tiers (name, logo size, benefits) and sponsors (full profile)
- Assign sponsors to tiers with ordering
- Bulk import sponsors via CSV
- Sponsor analytics dashboard (booth visits, lead captures, document downloads per sponsor)

**Public booth page** (`/[orgSlug]/[eventSlug]/sponsors/[sponsorId]`):
- Company logo, description, promo video
- Document downloads (brochures, one-pagers)
- Coupon codes display
- "Share my contact" lead capture button (attendee confirms sharing profile)
- Real-time booth chat via Supabase Realtime
- Visitor count

**Public sponsors listing** (`/[orgSlug]/[eventSlug]/sponsors`):
- Grouped by tier with tier name as section header
- Logo grid sized by tier level
- Link to each booth page

---

### B2. Event Website Builder

**Schema:** Add `website_config` JSONB column to `events`.

```json
{
  "enabled": true,
  "sections": [
    { "type": "hero", "visible": true, "content": { "headline": "...", "subtitle": "..." } },
    { "type": "about", "visible": true, "content": { "body": "..." } },
    { "type": "speakers", "visible": true, "content": { "title": "Featured Speakers", "featured_only": true } },
    { "type": "agenda", "visible": true, "content": { "title": "Schedule" } },
    { "type": "sponsors", "visible": true, "content": { "title": "Our Sponsors" } },
    { "type": "venue", "visible": true, "content": { "title": "Venue & Logistics" } },
    { "type": "faq", "visible": true, "content": { "items": [{ "q": "...", "a": "..." }] } },
    { "type": "cta", "visible": true, "content": { "text": "Register Now", "button_text": "Get Tickets" } }
  ],
  "theme": { "primary_color": "#...", "font": "Inter" },
  "custom_css": ""
}
```

**Organizer UI:**
- Section list with visibility toggles and drag-to-reorder
- Click section to edit its content (rich text for about, FAQ editor for faq, etc.)
- Theme picker (primary color, font selection)
- Live preview panel
- Custom CSS textarea for advanced users

**Public route:** `/[orgSlug]/[eventSlug]/website` — renders configured sections in order, pulling live data for dynamic sections (speakers, agenda, sponsors)

---

### B3. Logistics Page

**Schema changes** (extend `events` table):
- `venue_description` TEXT
- `venue_map_url` TEXT
- `logistics` JSONB DEFAULT '{}'

Logistics JSONB structure:
```json
{
  "parking": { "title": "Parking", "body": "..." },
  "hotels": [{ "name": "Hilton", "url": "...", "distance": "0.3 mi", "rate": "$149/night" }],
  "transportation": { "title": "Getting There", "body": "..." },
  "wifi": { "network": "EventWifi", "password": "..." },
  "contacts": [{ "name": "Help Desk", "phone": "...", "email": "..." }],
  "custom_sections": [{ "title": "...", "body": "..." }]
}
```

**Organizer UI:**
- Form with fields for each logistics section
- Hotel list editor (add/remove with name, URL, distance, rate)
- Custom sections editor (title + rich text body)
- Venue map embed (Google Maps URL or image upload)
- WiFi info fields

**Public page** (`/[orgSlug]/[eventSlug]/logistics`):
- Venue info with embedded map
- Parking, transportation, WiFi sections
- Recommended hotels with links
- Custom sections
- Emergency/help contacts

---

## Navigation Updates

**Organizer sub-sidebar additions:**
- Content section: Speakers (existing), Schedule (existing), Q&A, Documents
- Sponsors section: Tiers, Sponsors
- Marketing section: Website Builder (new), Widgets (existing), Recovery (existing)
- Event section: Logistics (new under Settings or standalone)

**Public page nav additions:**
- Speakers (existing), Schedule (existing), Q&A, Resources, Sponsors, Logistics, Website

**Embed widgets additions:**
- Sponsors widget
- Logistics widget

---

## RLS Strategy

All new tables follow existing patterns:
- Organizer access via `is_org_member(organization_id)` through event join
- Attendee access via `is_event_attendee(event_id)` or authenticated for Q&A/leads
- Public read access (anon SELECT) for sponsors listing, documents, logistics
- Booth messages: authenticated users can read/write for their own messages
- Leads: authenticated users can insert their own, sponsors/organizers can read all for their sponsor

---

## Implementation Order

**Phase A (Content Consumption):**
1. A1: Speaker Manager Enhancement (extends existing, small)
2. A4: Documents & Videos (new table, small)
3. A2: Agenda Import/Export (no new tables, medium)
4. A3: Session Q&A (new tables + realtime, medium)

**Phase B (Business & Operations):**
5. B3: Logistics Page (extends events, small)
6. B1: Exhibitor/Sponsor Center (many new tables, large)
7. B2: Event Website Builder (JSONB config + renderer, medium)

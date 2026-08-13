# Event Basics Page - Whova Parity Design

**Goal:** Rebuild the event creation and settings pages to match Whova's comprehensive "Basics" page, capturing all event information in a single scrollable form with sections.

## Current State

- 3-step create wizard: Basics (name, slug, dates) > Location (venue/virtual) > Details (description, cover image)
- Settings page: flat form with same fields + publishing/delete/duplicate/template sections
- Missing: abbreviation, welcome message, logo, rich text, map, attendee count, ride sharing, branding, promotion fields

## Target State

Single-page scrollable form (matching Whova) used for both:
- **Create** (`/events/new`) - same layout, empty fields
- **Settings** (`/events/[eventId]/settings`) - same layout, pre-filled

### Sections (matching Whova screenshot order)

#### 1. Basic Details
- **Event Name** - text (150 char limit, counter)
- **Event Name Abbreviation** - text (30 char limit, counter) - "Used where full name doesn't fit"
- **Start Date / End Date** - date pickers (MM/DD/YYYY)
- **Number of Attendees** - number input
- **Location** - Google Places autocomplete + embedded Google Map
  - Venue name, full address lines, city, state/province, zip, country
  - "Open in Maps" link, "Reset location" button
  - Auto-sets timezone from location
- **Time zone** - dropdown (auto-set from location, manually overridable)
- **Description** - Tiptap rich text editor (bold, italic, underline, font size, alignment, links, images, code, lists)

#### 2. Welcome Attendees
- **Welcome message** - textarea (10,000 char limit, counter)
  - Helper: "Send a welcome message to the users when they first join the app!"

#### 3. Airport Ride Sharing
- Radio group:
  - "Enable ride sharing for attendees between airports and venue"
  - "The event has provided transportation between airports and venue"
  - "We don't have attendees arriving from airports"

#### 4. Event Branding
- **Event Website URL** - url input
- **Logo** - image upload with crop/replace/delete (separate from cover image)
- **Twitter Hashtag(s)** - text input, comma-separated

#### 5. Post-event Analytics
- Radio: "Would you like an AI-generated event summary after the event ends?"
  - Yes / No

#### 6. Spark Conversation
- Radio: "Generate event-specific interests for attendees?"
  - Yes / No

#### 7. Let's Promote Your Event
- **Organization name** - text (100 char limit)
- **Attendee origin** - radio (Local regions / Across the nation / All over the world)
- **Topic tags** - tag input (add/remove tags)
- **Organization type** - checkbox multi-select (Association, Nonprofit, Government, Corporate, University, Other)
- **Event type** - radio (Academic conference, Business/Professional conference, Expo or trade show, Internal event or meeting, Workshop or seminar, Career fair, Other + text)

#### 8. Publishing (settings page only, keep existing)
- Status badge + Publish/Unpublish button

#### 9. Actions (settings page only, keep existing)
- Duplicate Event
- Save as Template
- Danger Zone (delete)

---

## Schema Changes

New migration `050_event_basics.sql` adding columns to `events`:

```sql
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS abbreviation TEXT,
  ADD COLUMN IF NOT EXISTS max_attendees INT,
  ADD COLUMN IF NOT EXISTS welcome_message TEXT,
  ADD COLUMN IF NOT EXISTS airport_ride_sharing TEXT NOT NULL DEFAULT 'none'
    CHECK (airport_ride_sharing IN ('enabled', 'provided', 'none')),
  ADD COLUMN IF NOT EXISTS event_website_url TEXT,
  ADD COLUMN IF NOT EXISTS logo TEXT,
  ADD COLUMN IF NOT EXISTS twitter_hashtags TEXT,
  ADD COLUMN IF NOT EXISTS post_event_summary BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS generate_interests BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS organization_name TEXT,
  ADD COLUMN IF NOT EXISTS attendee_origin TEXT
    CHECK (attendee_origin IN ('local', 'national', 'global')),
  ADD COLUMN IF NOT EXISTS topic_tags JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS organization_type JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS event_type TEXT,
  ADD COLUMN IF NOT EXISTS event_type_other TEXT,
  ADD COLUMN IF NOT EXISTS location_data JSONB NOT NULL DEFAULT '{}';
```

`location_data` JSONB stores structured location from Google Places:
```json
{
  "place_id": "ChIJ...",
  "formatted_address": "224 Jungmun..., Jeju, South Korea",
  "venue_name": "International Convention Center Jeju Island",
  "address_lines": ["224 Jungmunaegwanro...", "Seogwipo"],
  "city": "Seogwipo",
  "state": "Jeju-do",
  "zip": "63547",
  "country": "Korea, Republic of",
  "lat": 33.2541,
  "lng": 126.4100
}
```

Note: Keep existing `venue_name`, `venue_address` columns for backward compat but populate them from `location_data` on save.

---

## New Dependencies

- `@tiptap/react` + `@tiptap/starter-kit` + extensions - rich text editor
- `@react-google-maps/api` or `@vis.gl/react-google-maps` - Google Maps + Places autocomplete
- Google Maps API key in `.env.local`: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

---

## New Components

1. **`RichTextEditor`** (`src/shared/components/rich-text-editor.tsx`)
   - Tiptap wrapper matching our design system
   - Toolbar: bold, italic, underline, font size, alignment, link, image, code, ordered/unordered list
   - Controlled component: `value` (HTML string) + `onChange`

2. **`LocationPicker`** (`src/shared/components/location-picker.tsx`)
   - Google Places Autocomplete input
   - Embedded Google Map showing selected location
   - Outputs structured `location_data` JSONB
   - "Open in Maps" link, "Reset location" button

3. **`TagInput`** (`src/shared/components/tag-input.tsx`)
   - Add/remove tags with Enter key
   - Displays as colored badges

4. **`CharCounter`** (`src/shared/components/char-counter.tsx`)
   - Shows `current/max` character count on inputs

5. **`EventBasicsForm`** (`src/features/events/components/event-basics-form.tsx`)
   - The main form component used by both create and settings pages
   - Props: `event?: Event` (if editing), `onSubmit`, `mode: 'create' | 'edit'`
   - Single scrollable form with all 7 sections

---

## Pages

- **Create** (`/events/new/page.tsx`) - renders `EventBasicsForm` in create mode
- **Settings** (`/events/[eventId]/settings/page.tsx`) - renders `EventBasicsForm` in edit mode + Publishing/Actions sections below

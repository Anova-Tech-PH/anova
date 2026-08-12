# Embeddable Widgets Design

## Goal

Provide organizers with three iframe-based embeddable widgets (Agenda, Speakers, Registration) they can paste into external websites. Includes a full configurator UI with live preview in a new "Marketing" organizer tab. Follows Whova's approach where 40% of events use their embeddable agenda page.

## Architecture

### Approach: iframe-based embeds

Organizers get an `<iframe>` snippet to paste into their website. We serve dedicated lightweight pages with no Attendly header/nav. Styles are fully isolated via iframe boundary — no CSS conflicts with host sites.

### Route Structure

New `(embed)` route group with minimal layout (no header, no nav, just the widget content):

```
apps/web/src/app/(embed)/embed/[eventId]/
  layout.tsx          # Minimal layout: no header/nav, applies theme from params
  agenda/page.tsx     # Agenda widget
  speakers/page.tsx   # Speakers widget
  register/page.tsx   # Registration widget
```

### Configuration via URL params (stateless)

No new database tables. Widget appearance is encoded in URL search params:

```
/embed/{eventId}/agenda?accent=3b82f6&theme=dark&showDesc=1&showSpeakers=1&showTrack=1
```

Parameters:
- `accent` — hex color (no #), defaults to primary
- `theme` — `light` | `dark` | `auto`
- Common toggles per widget type (see below)

### Configurator UI

New organizer tab at `/events/[eventId]/marketing/` with three sections (one per widget type). Each section includes:

- Accent color picker
- Theme toggle (light/dark/auto)
- Field toggles specific to widget type
- Live preview iframe showing real-time changes
- Embed code textarea with copy button
- Direct link for sharing without iframe

## Widget Specifications

### 1. Agenda Widget

Displays event sessions grouped by day.

**Data source:** `sessions` table joined with `tracks`, `speakers`

**Toggles:**
- `showDesc` — show/hide session description (default: on)
- `showSpeakers` — show/hide speaker names/photos (default: on)
- `showTrack` — show/hide track name and color bar (default: on)
- `showTime` — show/hide session times (default: on)
- `showLocation` — show/hide room/location (default: on)

**Layout:**
- Day tabs or sections for multi-day events
- Session cards with track color left border
- Session type badges (keynote, talk, workshop, panel, break)
- Click to expand session details inline
- Speaker avatars inline on each session
- "Powered by Attendly" footer linking to full event page

### 2. Speakers Widget

Displays event speakers in a grid.

**Data source:** `speakers` table

**Toggles:**
- `showPhoto` — show/hide speaker photo (default: on)
- `showBio` — show/hide bio text (default: on)
- `showCompany` — show/hide title/company (default: on)
- `layout` — `grid` | `list` (default: grid)

**Layout:**
- 2-column responsive grid (or single-column list)
- Speaker photo with fallback icon
- Name, title at company, truncated bio
- "Powered by Attendly" footer

### 3. Registration Widget

Compact registration form for embedding.

**Data source:** `ticket_types`, `custom_registration_fields`, `registrations` (for availability counts)

**Toggles:**
- `showEventInfo` — show/hide event summary header (default: on)

**Layout:**
- Event summary card (date, venue)
- Ticket selection with availability
- Promo code input
- Name, email, custom fields
- Submit button
- Confirmation with QR code
- "Powered by Attendly" footer

## Organizer Marketing Tab

### New files:

```
apps/web/src/app/(organizer)/events/[eventId]/marketing/
  page.tsx              # Marketing tab with widget configurator sections
apps/web/src/features/widgets/
  components/
    widget-configurator.tsx    # Reusable configurator: controls + live preview + embed code
```

### Layout tab navigation:

Add "Marketing" tab to the event sidebar in layout.tsx (icon: Megaphone or Globe).

### Configurator component:

Single reusable `WidgetConfigurator` component that accepts:
- Widget type (agenda/speakers/register)
- Available toggles per type
- Event ID

Renders:
- Left panel: controls (color picker, theme, toggles)
- Right panel: live iframe preview that updates on every control change
- Bottom: embed code snippet + copy button + direct link

## Embed Code Format

```html
<iframe
  src="https://app.attendly.com/embed/{eventId}/agenda?accent=3b82f6&theme=light&showDesc=1&showSpeakers=1"
  width="100%"
  height="600"
  frameborder="0"
  style="border: none; border-radius: 8px;"
  title="Event Agenda"
></iframe>
```

## Tech Stack

- Server Components for embed pages (SSR, fast load, SEO-friendly)
- Existing Supabase queries for data
- Tailwind for styling with CSS custom properties for accent color
- No new database tables or migrations
- No new npm dependencies

## Security

- Embed pages are public (no auth required) — same as existing public event pages
- Only published events are embeddable (status = 'published' check)
- Registration widget uses existing `registerForEvent()` server action
- X-Frame-Options header must allow embedding (remove DENY/SAMEORIGIN for embed routes)

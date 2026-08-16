# Poll Answer Types, Percentage Display & Live Presentation Mode — Design

**Date:** 2026-08-16
**Status:** Approved

## Goal

Extend live polls from multiple-choice-only to 5 answer types (multiple choice, checkbox, short answer, star rating, word cloud), add percentage display to results, and add a live presentation mode for projecting results on screen.

## Architecture

- Add `answer_type` column to `live_polls` table with CHECK constraint
- Extend `live_poll_votes` with nullable `response_text` and `rating_value` columns, replace composite PK with UUID PK to support checkbox (multiple votes per user)
- New public route for live presentation mode (`/{orgSlug}/{eventSlug}/polls/{pollId}/present`)
- Word cloud rendered as CSS-based weighted word list (no external dependencies)

## Tech Stack

- PostgreSQL (schema migration), Next.js 16 server components, React 19, Tailwind 4, Supabase

---

## Schema Changes

### Migration: `087_poll_answer_types.sql`

**`live_polls` — add column:**
- `answer_type TEXT NOT NULL DEFAULT 'multiple_choice' CHECK (answer_type IN ('multiple_choice', 'checkbox', 'short_answer', 'star_rating', 'word_cloud'))`
- Existing `options` JSONB stores `{id, text}[]` for multiple_choice and checkbox
- For star_rating, short_answer, word_cloud — options stays as `[]`

**`live_poll_votes` — modify:**
- Drop composite PK `(poll_id, user_id)`
- Add `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- Add `response_text TEXT` — for short_answer and word_cloud
- Add `rating_value INT CHECK (rating_value >= 1 AND rating_value <= 5)` — for star_rating
- Make `option_id` nullable (unused for non-choice types)
- Add partial unique index: `UNIQUE (poll_id, user_id) WHERE option_id IS NULL` (non-choice types)
- Add partial unique index: `UNIQUE (poll_id, user_id, option_id) WHERE option_id IS NOT NULL` (choice types)

No RLS changes needed — existing policies cover the same tables.

---

## Vote Storage by Type

| Type | option_id | response_text | rating_value | Rows per user | Results |
|------|-----------|---------------|--------------|---------------|---------|
| multiple_choice | selected ID | null | null | 1 | Count per option |
| checkbox | selected ID | null | null | 1 per checked option | Count per option |
| short_answer | null | user text | null | 1 | List of responses |
| star_rating | null | null | 1-5 | 1 | Average + distribution |
| word_cloud | null | word/phrase | null | 1 | Frequency count (case-insensitive) |

---

## Server Actions & Queries

### Modified actions

- `createPoll()` — add `answer_type` to insert. Validate options non-empty for choice types only.
- `votePoll()` — accept union payload:
  - Choice: `{ optionId: string }` or `{ optionIds: string[] }` (checkbox)
  - Star rating: `{ rating: number }`
  - Text: `{ text: string }`
  - Checkbox: delete existing votes for poll+user, insert one row per checked option
  - Others: upsert single row
- `updatePoll()` — allow `answer_type` change only while draft

### Modified queries

- `PollWithResults` type extended with:
  - `answer_type` field
  - `average_rating?: number`
  - `rating_distribution?: Record<number, number>`
  - `text_responses?: string[]`
  - `word_frequencies?: Record<string, number>`
- Existing `vote_counts` + `total_votes` continue for choice types
- `pollsToCsv()` — handle new types in export

---

## UI Components

### Modified

- **PollCreator / AddPollDialog** — answer type dropdown. Show options editor for choice types only.
- **SessionPollCard** — render per answer_type:
  - multiple_choice: radio buttons (existing)
  - checkbox: checkboxes + submit
  - short_answer: text input + submit
  - star_rating: 5 clickable stars
  - word_cloud: text input + submit
- **PollResultsChart** — render per answer_type:
  - Choice types: horizontal bars with percentages (add % display)
  - Star rating: average + distribution histogram
  - Short answer: scrollable response list
  - Word cloud: CSS weighted word list (font-size proportional to frequency)
- **PollList** — add "Present" button per poll row

### New

- **PollPresentationView** — full-screen projector-friendly results. Large fonts, dark background, auto-scaling. Renders appropriate chart per answer_type.
- **Route: `/{orgSlug}/{eventSlug}/polls/{pollId}/present`** — public, no auth. Auto-refreshes every 5 seconds.

---

## Announcement Wall

No changes needed. Wall shows poll existence (question + "Cast your vote!"), not results. New answer types don't affect feed items.

---

## Testing (TDD)

**Unit tests:**
- `pollsToCsv` — new answer types (rating rows, text responses, word frequencies)
- Vote payload validation

**Action tests:**
- `createPoll` with each answer type
- `votePoll` with checkbox (multi-option), star rating, short answer, word cloud
- `updatePoll` rejects answer_type change when not draft

**Component tests:**
- Answer type dropdown toggles options editor
- SessionPollCard renders correct input per type
- PollResultsChart renders correct visualization per type
- PollPresentationView renders full-screen

**Migration:**
- Column exists, check constraint works, nullable option_id accepted

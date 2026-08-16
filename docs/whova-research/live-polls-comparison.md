# Live Polls: Whova vs Attendly (Evenstry) Comparison

**Date:** 2026-08-16
**Source:** Whova organizer dashboard exploration (Global Harvest Summit 2025)

---

## Question/Answer Types

| Type | Whova | Attendly |
|------|-------|----------|
| Multiple choice (single select) | Yes | Yes |
| Checkbox (multi-select) | Yes | **No** |
| Short answer (free text) | Yes | **No** |
| Star rating | Yes | **No** |
| Word cloud | Yes | **No** |

**Attendly only supports multiple choice (single select).** Whova offers 5 answer types from a single dropdown (`select[name="question.type"]`). This is the biggest feature gap.

---

## Poll Creation

| Feature | Whova | Attendly |
|---------|-------|----------|
| Create from scratch | Yes | Yes |
| Create from question bank | Yes (curated templates) | **No** |
| Reuse past poll (cross-event) | Yes (import from past events) | **No** |
| Speaker-created polls | Yes (speakers create their own, organizer approves) | **No** (organizer-only) |
| Session association | Yes | Yes |

Whova's "Create from bank" provides curated starter questions — useful for first-time organizers. "Reuse past form" lets organizers import polls from previous events, which is valuable for recurring events.

Speaker-created polls is a notable Whova differentiator — speakers can create polls for their own sessions, and organizers can optionally require approval (controlled via Settings).

---

## Poll Configuration Options

| Option | Whova | Attendly |
|--------|-------|----------|
| Anonymous responses | Yes | Yes |
| Result visibility | 3 modes: everyone who answered, everyone after closed, organizers only | 3 modes: everyone, after_closed, organizers_only |
| Open time | Open now / Schedule time | Open now / Before session / Scheduled |
| Attach to session | Yes | Yes |
| Target audience | All / By ticket type / By attendee category | **No** (all attendees only) |
| Prompt attendee (push notification) | Not visible in form | Yes |
| Gamification points for voting | Yes (via Gamification settings) | Yes (integrated) |

Result visibility and open time are at parity. Attendly actually has a **more granular** open time mode (`before_session` with configurable minutes offset) that Whova doesn't offer.

Whova's **audience targeting** (by ticket type or attendee category) is a gap — Attendly sends polls to all attendees.

---

## Poll Lifecycle & Management

| Feature | Whova | Attendly |
|---------|-------|----------|
| Status states | Open / (implied closed) | Draft / Open / Closed |
| Draft mode | Not visible (polls appear to go live immediately or scheduled) | Yes (explicit draft state) |
| Open/close toggle | Yes | Yes |
| Delete poll | Yes (via "More" menu) | Yes |
| Edit poll | Yes | Yes (question + options while in draft) |
| Download results (CSV) | Yes ("Download results" button at top) | Yes |
| View results | Yes (bar chart with percentages) | Yes (bar chart with vote counts) |

Attendly has a more explicit lifecycle with a **draft** state. Whova seems to either open immediately or schedule — no visible draft concept.

---

## Results & Presentation

| Feature | Whova | Attendly |
|---------|-------|----------|
| Bar chart results | Yes (horizontal bars with percentages) | Yes (horizontal bars with counts) |
| Percentage display | Yes (e.g., "71%") | **No** (shows raw vote counts only) |
| Live presentation mode | Yes ("Open live presentation" button) | **No** |
| Full screen results | Yes ("View in full screen") | **No** |
| Copy results link | Yes ("Copy link") | **No** |
| Announcement Wall integration | Yes ("Increase polling responses by announcing in Announcement Wall!") | Yes (polls shown on activity stream) |

Whova's **live presentation mode** is a major differentiator — organizers can project poll results on a screen during a session with a dedicated full-screen view. This is the kind of feature that drives real-time engagement at live events.

---

## Settings (Global Poll Configuration)

| Setting | Whova | Attendly |
|---------|-------|----------|
| Auto-approve speaker polls | Yes (toggle) | N/A (no speaker polls) |
| Social media sharing of results | Yes (toggle) | **No** |

---

## Summary: Key Gaps to Address

### High Priority (core engagement features)
1. **Additional question types** — Checkbox (multi-select), short answer, star rating, word cloud. These unlock richer engagement beyond simple A/B voting.
2. **Live presentation mode** — Full-screen, projector-friendly results view. Essential for live event engagement.
3. **Percentage display** — Show percentages alongside vote counts in results.

### Medium Priority (power-user features)
4. **Audience targeting** — Target polls to specific ticket types or attendee categories.
5. **Speaker-created polls** — Let speakers create polls for their sessions (with optional organizer approval).
6. **Shareable results link** — Copy link to share poll results externally.

### Low Priority (nice-to-have)
7. **Question bank** — Pre-built poll question templates for common scenarios.
8. **Reuse past polls** — Import polls from previous events.
9. **Social media sharing** — Share poll results to social platforms.

### Where Attendly is Already Ahead
- **Explicit draft state** — More controlled lifecycle than Whova
- **Before-session auto-open** — Configurable offset (X minutes before session) that Whova doesn't have
- **Integrated gamification** — Points awarded inline during voting, not as a separate setting
- **Activity stream integration** — Polls appear in the live activity stream feed

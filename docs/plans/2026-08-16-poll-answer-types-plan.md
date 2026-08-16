# Poll Answer Types, Percentage Display & Live Presentation Mode — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend live polls from multiple-choice-only to 5 answer types (multiple choice, checkbox, short answer, star rating, word cloud), add percentage display to organizer results, and add a public live presentation route for projecting poll results.

**Architecture:** Add `answer_type` column to `live_polls`, extend `live_poll_votes` with `response_text`/`rating_value` columns and replace composite PK with UUID PK for checkbox multi-vote support. Modify existing poll components to render type-specific input and results UIs. Add new public route for live presentation.

**Tech Stack:** PostgreSQL migrations, Next.js 16 server components, React 19, TypeScript, Tailwind 4, Vitest, Supabase

---

### Task 1: Database Migration

**Files:**
- Create: `packages/supabase/migrations/088_poll_answer_types.sql`

**Context:** The `live_polls` table currently only supports multiple choice. We need an `answer_type` column. The `live_poll_votes` table has a composite PK `(poll_id, user_id)` which prevents checkbox (multi-select) — we need a UUID PK instead with partial unique indexes.

**Step 1: Write the migration**

```sql
-- =============================================================================
-- Migration 088: Poll Answer Types
-- Adds answer_type to live_polls, extends live_poll_votes for non-choice types
-- =============================================================================

-- 1. Add answer_type to live_polls
ALTER TABLE public.live_polls
  ADD COLUMN answer_type TEXT NOT NULL DEFAULT 'multiple_choice'
  CHECK (answer_type IN ('multiple_choice', 'checkbox', 'short_answer', 'star_rating', 'word_cloud'));

-- 2. Restructure live_poll_votes for multi-vote (checkbox) and non-choice types
-- Drop composite PK, add UUID PK
ALTER TABLE public.live_poll_votes
  DROP CONSTRAINT live_poll_votes_pkey;

ALTER TABLE public.live_poll_votes
  ADD COLUMN id UUID DEFAULT gen_random_uuid();

-- Backfill IDs for existing rows
UPDATE public.live_poll_votes SET id = gen_random_uuid() WHERE id IS NULL;

ALTER TABLE public.live_poll_votes
  ALTER COLUMN id SET NOT NULL,
  ADD PRIMARY KEY (id);

-- Make option_id nullable (unused for non-choice types)
ALTER TABLE public.live_poll_votes
  ALTER COLUMN option_id DROP NOT NULL;

-- Add response columns for non-choice types
ALTER TABLE public.live_poll_votes
  ADD COLUMN response_text TEXT,
  ADD COLUMN rating_value INT CHECK (rating_value >= 1 AND rating_value <= 5);

-- Partial unique indexes to enforce constraints per type:
-- For choice types: one vote per option per user (allows multiple options for checkbox)
CREATE UNIQUE INDEX idx_poll_votes_choice
  ON public.live_poll_votes (poll_id, user_id, option_id)
  WHERE option_id IS NOT NULL;

-- For non-choice types: one response per user
CREATE UNIQUE INDEX idx_poll_votes_response
  ON public.live_poll_votes (poll_id, user_id)
  WHERE option_id IS NULL;
```

**Step 2: Apply the migration**

Run: `npx supabase db query --local < packages/supabase/migrations/088_poll_answer_types.sql`

If `npx supabase migration up` works, prefer that. If it fails due to legacy mismatch, use `db query --local` directly.

**Step 3: Verify**

Run: `npx supabase db query --local "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'live_polls' AND column_name = 'answer_type'"`
Expected: One row showing `answer_type | text | NO`

Run: `npx supabase db query --local "SELECT column_name FROM information_schema.columns WHERE table_name = 'live_poll_votes' AND column_name IN ('id', 'response_text', 'rating_value') ORDER BY column_name"`
Expected: Three rows (id, rating_value, response_text)

**Step 4: Commit**

```bash
git add packages/supabase/migrations/088_poll_answer_types.sql
git commit -m "feat(db): add answer_type to live_polls, extend live_poll_votes schema"
```

---

### Task 2: Update TypeScript Types & Queries

**Files:**
- Modify: `apps/web/src/features/polls/queries.ts`

**Context:** The `LivePoll` type needs `answer_type`. `PollWithResults` needs new fields for non-choice results. Query functions need to aggregate results differently per type.

**Step 1: Write the failing test**

Create file: `apps/web/src/features/polls/queries.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import type { LivePoll, PollWithResults, AnswerType } from "./queries";

describe("Poll types", () => {
  it("LivePoll includes answer_type field", () => {
    const poll: LivePoll = {
      id: "p1",
      event_id: "e1",
      session_id: null,
      created_by: "u1",
      question: "Rate this",
      options: [],
      status: "draft",
      show_results: false,
      is_anonymous: false,
      prompt_attendee: true,
      result_visibility: "everyone",
      open_time_mode: "now",
      open_before_minutes: 0,
      scheduled_open_at: null,
      sort_order: 0,
      created_at: "",
      updated_at: "",
      answer_type: "star_rating",
    };
    expect(poll.answer_type).toBe("star_rating");
  });

  it("AnswerType includes all 5 types", () => {
    const types: AnswerType[] = [
      "multiple_choice",
      "checkbox",
      "short_answer",
      "star_rating",
      "word_cloud",
    ];
    expect(types).toHaveLength(5);
  });

  it("PollWithResults includes extended result fields", () => {
    const poll: PollWithResults = {
      id: "p1",
      event_id: "e1",
      session_id: null,
      created_by: "u1",
      question: "Rate this",
      options: [],
      status: "open",
      show_results: true,
      is_anonymous: false,
      prompt_attendee: true,
      result_visibility: "everyone",
      open_time_mode: "now",
      open_before_minutes: 0,
      scheduled_open_at: null,
      sort_order: 0,
      created_at: "",
      updated_at: "",
      answer_type: "star_rating",
      vote_counts: {},
      total_votes: 5,
      average_rating: 4.2,
      rating_distribution: { 1: 0, 2: 0, 3: 1, 4: 2, 5: 2 },
    };
    expect(poll.average_rating).toBe(4.2);
    expect(poll.rating_distribution).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run src/features/polls/queries.test.ts`
Expected: FAIL — `answer_type` does not exist on type `LivePoll`

**Step 3: Update the types in queries.ts**

In `apps/web/src/features/polls/queries.ts`, add:

After line 6 (after `PollOption` type):

```typescript
export type AnswerType =
  | "multiple_choice"
  | "checkbox"
  | "short_answer"
  | "star_rating"
  | "word_cloud";
```

In the `LivePoll` type, add after `updated_at`:

```typescript
  answer_type: AnswerType;
```

In the `PollWithResults` type, add after `session_title`:

```typescript
  average_rating?: number;
  rating_distribution?: Record<number, number>;
  text_responses?: string[];
  word_frequencies?: Record<string, number>;
```

**Step 4: Run test to verify it passes**

Run: `cd apps/web && npx vitest run src/features/polls/queries.test.ts`
Expected: PASS

**Step 5: Update getPolls and getPollWithResults to aggregate new types**

Modify the vote counting logic in both `getPolls()` and `getPollWithResults()`. After the existing `vote_counts` loop, add type-specific aggregation:

```typescript
// After the existing vote_counts loop, add:
let average_rating: number | undefined;
let rating_distribution: Record<number, number> | undefined;
let text_responses: string[] | undefined;
let word_frequencies: Record<string, number> | undefined;

const answerType = poll.answer_type as AnswerType ?? "multiple_choice";

if (answerType === "star_rating") {
  const { data: ratingVotes } = await supabase
    .from("live_poll_votes")
    .select("rating_value")
    .eq("poll_id", poll.id)
    .not("rating_value", "is", null);

  const ratings = (ratingVotes ?? []).map((v) => v.rating_value as number);
  if (ratings.length > 0) {
    average_rating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    rating_distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of ratings) {
      rating_distribution[r] = (rating_distribution[r] ?? 0) + 1;
    }
  }
} else if (answerType === "short_answer") {
  const { data: textVotes } = await supabase
    .from("live_poll_votes")
    .select("response_text")
    .eq("poll_id", poll.id)
    .not("response_text", "is", null);

  text_responses = (textVotes ?? []).map((v) => v.response_text as string);
} else if (answerType === "word_cloud") {
  const { data: wordVotes } = await supabase
    .from("live_poll_votes")
    .select("response_text")
    .eq("poll_id", poll.id)
    .not("response_text", "is", null);

  word_frequencies = {};
  for (const v of wordVotes ?? []) {
    const word = (v.response_text as string).toLowerCase().trim();
    word_frequencies[word] = (word_frequencies[word] ?? 0) + 1;
  }
}
```

Add these fields to the results.push() call:

```typescript
results.push({
  ...poll,
  options: (poll.options ?? []) as PollOption[],
  answer_type: answerType,
  vote_counts,
  total_votes: votes?.length ?? 0,
  session_title: sessionTitle ?? undefined,
  average_rating,
  rating_distribution,
  text_responses,
  word_frequencies,
});
```

Apply the same pattern to `getPollWithResults()`, `getActivePolls()`.

**Step 6: Run all poll tests**

Run: `cd apps/web && npx vitest run src/features/polls/`
Expected: All tests PASS

**Step 7: Commit**

```bash
git add apps/web/src/features/polls/queries.ts apps/web/src/features/polls/queries.test.ts
git commit -m "feat(polls): add answer_type to types and extend result aggregation"
```

---

### Task 3: Update Server Actions (createPoll, votePoll)

**Files:**
- Modify: `apps/web/src/features/polls/actions.ts`
- Modify: `apps/web/src/features/polls/actions.test.ts`

**Context:** `createPoll` needs to accept `answer_type`. `votePoll` needs to handle multiple input shapes: option selection, checkbox multi-select, star rating, and text responses.

**Step 1: Write failing tests for createPoll with answer_type**

Add to `apps/web/src/features/polls/actions.test.ts`:

```typescript
describe("createPoll with answer_type", () => {
  it("creates star_rating poll with no options", async () => {
    mockFrom.mockReturnValue(
      createQueryMock({
        data: { id: "poll-2", question: "Rate this session", status: "draft", answer_type: "star_rating" },
        error: null,
      })
    );

    const { createPoll } = await import("./actions");
    const result = await createPoll("evt-1", {
      question: "Rate this session",
      options: [],
      answer_type: "star_rating",
    });

    expect(result).toHaveProperty("answer_type", "star_rating");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run src/features/polls/actions.test.ts`
Expected: FAIL — `answer_type` not in createPoll data parameter

**Step 3: Update createPoll in actions.ts**

Add `answer_type?: AnswerType` to the `data` parameter (import `AnswerType` from `./queries`). Add it to the insert:

```typescript
answer_type: data.answer_type ?? "multiple_choice",
```

**Step 4: Write failing tests for new votePoll signatures**

Add to actions.test.ts:

```typescript
describe("votePoll extended", () => {
  it("records star rating vote", async () => {
    mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

    const { voteRating } = await import("./actions");
    await voteRating("poll-1", 4);

    expect(mockFrom).toHaveBeenCalledWith("live_poll_votes");
  });

  it("records text response vote", async () => {
    mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

    const { voteText } = await import("./actions");
    await voteText("poll-1", "Great session!");

    expect(mockFrom).toHaveBeenCalledWith("live_poll_votes");
  });

  it("records checkbox votes (multiple options)", async () => {
    mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

    const { voteCheckbox } = await import("./actions");
    await voteCheckbox("poll-1", ["opt-a", "opt-c"]);

    expect(mockFrom).toHaveBeenCalledWith("live_poll_votes");
  });
});
```

**Step 5: Run to verify fails**

Run: `cd apps/web && npx vitest run src/features/polls/actions.test.ts`
Expected: FAIL — `voteRating`, `voteText`, `voteCheckbox` not exported

**Step 6: Implement new vote actions in actions.ts**

```typescript
export async function voteRating(pollId: string, rating: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { error } = await supabase
    .from("live_poll_votes")
    .upsert(
      { poll_id: pollId, user_id: user.id, rating_value: rating, option_id: null, response_text: null },
      { onConflict: "idx_poll_votes_response" }
    );

  if (error) {
    // Fallback: delete then insert (partial unique indexes don't work with upsert)
    await supabase.from("live_poll_votes").delete().eq("poll_id", pollId).eq("user_id", user.id);
    const { error: insertError } = await supabase.from("live_poll_votes").insert({
      poll_id: pollId, user_id: user.id, rating_value: rating,
    });
    if (insertError) throw new Error(insertError.message);
  }

  const { data: poll } = await supabase.from("live_polls").select("event_id").eq("id", pollId).single();
  if (poll?.event_id) await tryAwardPoints(poll.event_id, user.id, "poll_vote", pollId, "poll");
}

export async function voteText(pollId: string, text: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  // Delete existing then insert (partial unique index)
  await supabase.from("live_poll_votes").delete().eq("poll_id", pollId).eq("user_id", user.id);
  const { error } = await supabase.from("live_poll_votes").insert({
    poll_id: pollId, user_id: user.id, response_text: text.trim(),
  });
  if (error) throw new Error(error.message);

  const { data: poll } = await supabase.from("live_polls").select("event_id").eq("id", pollId).single();
  if (poll?.event_id) await tryAwardPoints(poll.event_id, user.id, "poll_vote", pollId, "poll");
}

export async function voteCheckbox(pollId: string, optionIds: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  // Delete all existing votes for this poll+user, then insert new ones
  await supabase.from("live_poll_votes").delete().eq("poll_id", pollId).eq("user_id", user.id);
  const rows = optionIds.map((optionId) => ({
    poll_id: pollId, user_id: user.id, option_id: optionId,
  }));
  const { error } = await supabase.from("live_poll_votes").insert(rows);
  if (error) throw new Error(error.message);

  const { data: poll } = await supabase.from("live_polls").select("event_id").eq("id", pollId).single();
  if (poll?.event_id) await tryAwardPoints(poll.event_id, user.id, "poll_vote", pollId, "poll");
}
```

**Step 7: Run all poll tests**

Run: `cd apps/web && npx vitest run src/features/polls/`
Expected: All PASS

**Step 8: Commit**

```bash
git add apps/web/src/features/polls/actions.ts apps/web/src/features/polls/actions.test.ts
git commit -m "feat(polls): add answer_type to createPoll, add voteRating/voteText/voteCheckbox actions"
```

---

### Task 4: Update CSV Export for New Types

**Files:**
- Modify: `apps/web/src/features/polls/export.ts`
- Modify: `apps/web/src/features/polls/export.test.ts`

**Context:** The CSV export currently only handles choice-type polls (one row per option). New types need different row formats.

**Step 1: Write failing tests**

Add to `apps/web/src/features/polls/export.test.ts`:

```typescript
it("formats star rating poll with average and distribution", () => {
  const poll = makePoll({
    answer_type: "star_rating",
    question: "Rate the session",
    options: [],
    vote_counts: {},
    total_votes: 3,
    average_rating: 4.3,
    rating_distribution: { 1: 0, 2: 0, 3: 1, 4: 1, 5: 1 },
  });
  const csv = pollsToCsv([poll]);
  const lines = csv.split("\n");

  // Header + 5 rating rows
  expect(lines).toHaveLength(6);
  expect(lines[1]).toContain('"1 star"');
  expect(lines[5]).toContain('"5 stars"');
});

it("formats short answer poll with text responses", () => {
  const poll = makePoll({
    answer_type: "short_answer",
    question: "Any feedback?",
    options: [],
    vote_counts: {},
    total_votes: 2,
    text_responses: ["Great talk!", "Needs more examples"],
  });
  const csv = pollsToCsv([poll]);
  const lines = csv.split("\n");

  expect(lines).toHaveLength(3); // header + 2 responses
  expect(lines[1]).toContain('"Great talk!"');
  expect(lines[2]).toContain('"Needs more examples"');
});

it("formats word cloud poll with frequencies", () => {
  const poll = makePoll({
    answer_type: "word_cloud",
    question: "One word to describe this?",
    options: [],
    vote_counts: {},
    total_votes: 5,
    word_frequencies: { "amazing": 3, "inspiring": 2 },
  });
  const csv = pollsToCsv([poll]);
  const lines = csv.split("\n");

  expect(lines).toHaveLength(3); // header + 2 words
  expect(lines[1]).toContain('"amazing"');
  expect(lines[1]).toContain('"3"');
});
```

Note: you'll also need to add `answer_type: "multiple_choice"` to the `makePoll` defaults.

**Step 2: Run to verify fails**

Run: `cd apps/web && npx vitest run src/features/polls/export.test.ts`
Expected: FAIL

**Step 3: Implement export changes**

Update `pollsToCsv` in `export.ts`:

```typescript
export function pollsToCsv(polls: PollWithResults[]): string {
  const rows: string[][] = [
    ["Question", "Option", "Votes", "Percentage", "Status", "Session"],
  ];
  for (const poll of polls) {
    const answerType = poll.answer_type ?? "multiple_choice";

    if (answerType === "star_rating" && poll.rating_distribution) {
      for (let star = 1; star <= 5; star++) {
        const count = poll.rating_distribution[star] ?? 0;
        const pct = poll.total_votes > 0 ? ((count / poll.total_votes) * 100).toFixed(1) : "0.0";
        rows.push([
          poll.question,
          `${star} star${star !== 1 ? "s" : ""}`,
          String(count),
          `${pct}%`,
          poll.status,
          poll.session_title ?? "",
        ]);
      }
    } else if (answerType === "short_answer" && poll.text_responses) {
      for (const response of poll.text_responses) {
        rows.push([poll.question, response, "1", "", poll.status, poll.session_title ?? ""]);
      }
    } else if (answerType === "word_cloud" && poll.word_frequencies) {
      const totalWords = Object.values(poll.word_frequencies).reduce((a, b) => a + b, 0);
      for (const [word, count] of Object.entries(poll.word_frequencies)) {
        const pct = totalWords > 0 ? ((count / totalWords) * 100).toFixed(1) : "0.0";
        rows.push([poll.question, word, String(count), `${pct}%`, poll.status, poll.session_title ?? ""]);
      }
    } else {
      // multiple_choice and checkbox
      for (const opt of poll.options) {
        const count = poll.vote_counts[opt.id] ?? 0;
        const pct = poll.total_votes > 0 ? ((count / poll.total_votes) * 100).toFixed(1) : "0.0";
        rows.push([poll.question, opt.text, String(count), `${pct}%`, poll.status, poll.session_title ?? ""]);
      }
    }
  }
  return rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
}
```

**Step 4: Run to verify passes**

Run: `cd apps/web && npx vitest run src/features/polls/export.test.ts`
Expected: All PASS

**Step 5: Commit**

```bash
git add apps/web/src/features/polls/export.ts apps/web/src/features/polls/export.test.ts
git commit -m "feat(polls): extend CSV export for star rating, short answer, word cloud types"
```

---

### Task 5: PollCreator & AddPollDialog — Answer Type Selector

**Files:**
- Modify: `apps/web/src/features/polls/components/poll-creator.tsx`
- Modify: `apps/web/src/features/polls/components/add-poll-dialog.tsx`

**Context:** Both poll creation forms need an "Answer type" dropdown. When a non-choice type is selected, the options editor should be hidden.

**Step 1: Update PollCreator**

Add state and dropdown:

```typescript
const [answerType, setAnswerType] = useState<AnswerType>("multiple_choice");
```

Import `AnswerType` from `../queries`.

Add dropdown after the question input (around line 71):

```tsx
<div className="space-y-1.5">
  <label htmlFor="poll-answer-type" className="text-sm font-medium">
    Answer type
  </label>
  <select
    id="poll-answer-type"
    value={answerType}
    onChange={(e) => setAnswerType(e.target.value as AnswerType)}
    className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
  >
    <option value="multiple_choice">Multiple choice</option>
    <option value="checkbox">Checkbox (multi-select)</option>
    <option value="short_answer">Short answer</option>
    <option value="star_rating">Star rating</option>
    <option value="word_cloud">Word cloud</option>
  </select>
</div>
```

Wrap the options section (lines 73-107) in a conditional:

```tsx
{(answerType === "multiple_choice" || answerType === "checkbox") && (
  <div className="space-y-1.5">
    {/* existing options editor */}
  </div>
)}
```

Update `handleCreate` to pass `answer_type` and relax the options validation:

```typescript
function handleCreate() {
  const trimmedQuestion = question.trim();
  if (!trimmedQuestion) return;

  const needsOptions = answerType === "multiple_choice" || answerType === "checkbox";
  const trimmedOptions = options.map((o) => o.trim()).filter(Boolean);
  if (needsOptions && trimmedOptions.length < 2) return;

  startTransition(async () => {
    await createPoll(eventId, {
      question: trimmedQuestion,
      options: needsOptions
        ? trimmedOptions.map((text, i) => ({ id: String.fromCharCode(97 + i), text }))
        : [],
      session_id: sessionId || undefined,
      answer_type: answerType,
    });
    resetForm();
  });
}
```

Update `resetForm` to reset `answerType`:

```typescript
function resetForm() {
  setQuestion("");
  setOptions(["", ""]);
  setSessionId("");
  setAnswerType("multiple_choice");
}
```

Update disabled check on the Create button:

```typescript
disabled={isPending || !question.trim() || ((answerType === "multiple_choice" || answerType === "checkbox") && options.filter((o) => o.trim()).length < 2)}
```

**Step 2: Update AddPollDialog similarly**

Add `answerType` state, dropdown after question input, conditional options section, pass `answer_type` to `createPoll`, update validation.

**Step 3: Run existing tests**

Run: `cd apps/web && npx vitest run src/features/polls/`
Expected: All PASS (existing tests use default multiple_choice behavior)

**Step 4: Commit**

```bash
git add apps/web/src/features/polls/components/poll-creator.tsx apps/web/src/features/polls/components/add-poll-dialog.tsx
git commit -m "feat(polls): add answer type selector to poll creation forms"
```

---

### Task 6: SessionPollCard — Type-Specific Voting UI

**Files:**
- Modify: `apps/web/src/features/polls/components/session-poll-card.tsx`

**Context:** The attendee-facing poll card currently only renders radio-button-style options. It needs to render different input UIs based on `answer_type`: checkboxes, text input, star rating, or word input.

**Step 1: Modify SessionPollCard to dispatch on answer_type**

Replace the existing options rendering (lines 64-98) with a type switch. Keep the existing code for `multiple_choice`. Add new sections:

For **checkbox**: render checkboxes instead of radio buttons. Add a "Submit" button. Use `voteCheckbox` action. Track `selectedOptions: string[]` state instead of single `selectedOption`.

For **star_rating**: render 5 star icons (filled/empty). Clicking a star calls `voteRating`. Show current selection.

```tsx
function StarRatingInput({ value, onChange, disabled }: { value: number | null; onChange: (v: number) => void; disabled: boolean }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          disabled={disabled}
          className={`text-2xl transition-colors ${
            value && star <= value ? "text-yellow-400" : "text-muted-foreground/30"
          } hover:text-yellow-400 disabled:cursor-default`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
```

For **short_answer** and **word_cloud**: render a text input + submit button. Use `voteText` action.

```tsx
function TextInput({ placeholder, onSubmit, disabled, existingResponse }: {
  placeholder: string;
  onSubmit: (text: string) => void;
  disabled: boolean;
  existingResponse: string | null;
}) {
  const [text, setText] = useState(existingResponse ?? "");
  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      <button
        type="button"
        onClick={() => text.trim() && onSubmit(text.trim())}
        disabled={disabled || !text.trim()}
        className="rounded-md bg-foreground text-background px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        Submit
      </button>
    </div>
  );
}
```

The main component needs to accept `userVote` as `string | null` for choice types, but for other types it needs the actual response. Extend the props:

```typescript
export function SessionPollCard({
  poll,
  userVote,
  userTextResponse,
  userRating,
  userCheckboxVotes,
}: {
  poll: PollWithResults;
  userVote: string | null;
  userTextResponse?: string | null;
  userRating?: number | null;
  userCheckboxVotes?: string[];
})
```

**Step 2: Update the session detail page to pass new props**

In `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/schedule/[sessionId]/page.tsx`, extend the vote fetching to also get `response_text` and `rating_value`:

```typescript
// After existing userVote fetch, add:
let userTextResponse: string | null = null;
let userRating: number | null = null;
let userCheckboxVotes: string[] = [];

if (user && poll.answer_type !== "multiple_choice") {
  const { data: userVotes } = await supabase
    .from("live_poll_votes")
    .select("option_id, response_text, rating_value")
    .eq("poll_id", poll.id)
    .eq("user_id", user.id);

  if (poll.answer_type === "checkbox") {
    userCheckboxVotes = (userVotes ?? []).map(v => v.option_id).filter(Boolean);
  } else if (poll.answer_type === "star_rating") {
    userRating = userVotes?.[0]?.rating_value ?? null;
  } else {
    userTextResponse = userVotes?.[0]?.response_text ?? null;
  }
}
```

Pass these as props to `SessionPollCard`.

**Step 3: Run all tests**

Run: `cd apps/web && npx vitest run src/features/polls/`
Expected: All PASS

**Step 4: Commit**

```bash
git add apps/web/src/features/polls/components/session-poll-card.tsx apps/web/src/app/(public)/[orgSlug]/[eventSlug]/schedule/[sessionId]/page.tsx
git commit -m "feat(polls): type-specific voting UI for checkbox, star rating, short answer, word cloud"
```

---

### Task 7: PollResultsChart — Type-Specific Results Display

**Files:**
- Modify: `apps/web/src/features/polls/components/poll-results-chart.tsx`

**Context:** Currently renders horizontal bars only. Needs to render different visualizations per answer_type: bar chart with percentages for choice types, star average + distribution for ratings, response list for short answer, weighted word list for word cloud.

**Step 1: Extend PollResultsChart props**

```typescript
import type { PollWithResults } from "@/features/polls/queries";

export function PollResultsChart({ poll }: { poll: PollWithResults }) {
```

This is a breaking change — all callers currently pass `options`, `voteCounts`, `totalVotes` separately. Update callers (PollList line 187-190) to pass `poll={poll}` instead.

**Step 2: Implement type-specific renderers inside PollResultsChart**

```tsx
export function PollResultsChart({ poll }: { poll: PollWithResults }) {
  const answerType = poll.answer_type ?? "multiple_choice";

  if (answerType === "star_rating") {
    return <StarRatingResults poll={poll} />;
  }
  if (answerType === "short_answer") {
    return <TextResponseList responses={poll.text_responses ?? []} />;
  }
  if (answerType === "word_cloud") {
    return <WordCloudResults frequencies={poll.word_frequencies ?? {}} />;
  }
  // multiple_choice and checkbox — bar chart (existing)
  return <BarChartResults options={poll.options} voteCounts={poll.vote_counts} totalVotes={poll.total_votes} />;
}
```

**StarRatingResults:**
```tsx
function StarRatingResults({ poll }: { poll: PollWithResults }) {
  const avg = poll.average_rating ?? 0;
  const dist = poll.rating_distribution ?? {};
  const total = poll.total_votes;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-3xl font-bold">{avg.toFixed(1)}</span>
        <div className="flex text-yellow-400 text-xl">
          {[1, 2, 3, 4, 5].map((s) => (
            <span key={s} className={s <= Math.round(avg) ? "" : "opacity-30"}>★</span>
          ))}
        </div>
        <span className="text-sm text-muted-foreground">{total} {total === 1 ? "rating" : "ratings"}</span>
      </div>
      {[5, 4, 3, 2, 1].map((star) => {
        const count = dist[star] ?? 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={star} className="flex items-center gap-2 text-sm">
            <span className="w-12">{star} star{star !== 1 ? "s" : ""}</span>
            <div className="h-3 flex-1 rounded-full bg-muted">
              <div className="h-3 rounded-full bg-yellow-400 transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="w-12 text-right text-muted-foreground">{count}</span>
          </div>
        );
      })}
    </div>
  );
}
```

**TextResponseList:**
```tsx
function TextResponseList({ responses }: { responses: string[] }) {
  if (responses.length === 0) return <p className="text-sm text-muted-foreground">No responses yet.</p>;
  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {responses.map((r, i) => (
        <div key={i} className="rounded-md border px-3 py-2 text-sm">{r}</div>
      ))}
    </div>
  );
}
```

**WordCloudResults:**
```tsx
function WordCloudResults({ frequencies }: { frequencies: Record<string, number> }) {
  const entries = Object.entries(frequencies).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return <p className="text-sm text-muted-foreground">No responses yet.</p>;

  const maxCount = entries[0][1];
  const minSize = 0.875; // rem
  const maxSize = 2.5; // rem

  return (
    <div className="flex flex-wrap gap-2 py-2">
      {entries.map(([word, count]) => {
        const size = maxCount > 1
          ? minSize + ((count - 1) / (maxCount - 1)) * (maxSize - minSize)
          : (minSize + maxSize) / 2;
        return (
          <span
            key={word}
            className="inline-block text-foreground/80"
            style={{ fontSize: `${size}rem` }}
            title={`${word}: ${count}`}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
}
```

**Step 3: Update PollList to use new props**

In `poll-list.tsx` line 187-190, change:

```tsx
<PollResultsChart
  options={poll.options}
  voteCounts={poll.vote_counts}
  totalVotes={poll.total_votes}
/>
```

To:

```tsx
<PollResultsChart poll={poll} />
```

**Step 4: Run all tests**

Run: `cd apps/web && npx vitest run src/features/polls/`
Expected: All PASS

**Step 5: Commit**

```bash
git add apps/web/src/features/polls/components/poll-results-chart.tsx apps/web/src/features/polls/components/poll-list.tsx
git commit -m "feat(polls): type-specific results display — stars, text list, word cloud, bar chart with percentages"
```

---

### Task 8: Live Presentation Route

**Files:**
- Create: `apps/web/src/features/polls/components/poll-presentation-view.tsx`
- Create: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/polls/[pollId]/present/page.tsx`

**Context:** A public, full-screen route for projecting poll results. Dark background, large fonts, auto-refreshes every 5 seconds. Reuses the result renderers from PollResultsChart but scaled up for projection.

**Step 1: Create PollPresentationView component**

```tsx
"use client";

import type { PollWithResults } from "@/features/polls/queries";

export function PollPresentationView({ poll }: { poll: PollWithResults }) {
  const answerType = poll.answer_type ?? "multiple_choice";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-950 p-8 text-white">
      <div className="w-full max-w-3xl space-y-8">
        <div className="space-y-2 text-center">
          <p className="text-sm uppercase tracking-widest text-gray-400">Live Poll</p>
          <h1 className="text-3xl font-bold md:text-4xl">{poll.question}</h1>
          <p className="text-lg text-gray-400">{poll.total_votes} {poll.total_votes === 1 ? "response" : "responses"}</p>
        </div>

        <div className="rounded-2xl bg-gray-900 p-6 md:p-8">
          {(answerType === "multiple_choice" || answerType === "checkbox") && (
            <PresentationBarChart poll={poll} />
          )}
          {answerType === "star_rating" && <PresentationStarRating poll={poll} />}
          {answerType === "short_answer" && <PresentationTextResponses responses={poll.text_responses ?? []} />}
          {answerType === "word_cloud" && <PresentationWordCloud frequencies={poll.word_frequencies ?? {}} />}
        </div>

        <p className="text-center text-xs text-gray-600">Powered by Evenstry</p>
      </div>
    </div>
  );
}

function PresentationBarChart({ poll }: { poll: PollWithResults }) {
  return (
    <div className="space-y-4">
      {poll.options.map((opt) => {
        const count = poll.vote_counts[opt.id] ?? 0;
        const pct = poll.total_votes > 0 ? Math.round((count / poll.total_votes) * 100) : 0;
        return (
          <div key={opt.id} className="space-y-1">
            <div className="flex items-center justify-between text-lg">
              <span>{opt.text}</span>
              <span className="text-gray-400">{pct}% <span className="text-sm">({count})</span></span>
            </div>
            <div className="h-6 w-full rounded-full bg-gray-800">
              <div
                className="h-6 rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PresentationStarRating({ poll }: { poll: PollWithResults }) {
  const avg = poll.average_rating ?? 0;
  const dist = poll.rating_distribution ?? {};
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center gap-4">
        <span className="text-6xl font-bold">{avg.toFixed(1)}</span>
        <div className="flex text-4xl text-yellow-400">
          {[1, 2, 3, 4, 5].map((s) => (
            <span key={s} className={s <= Math.round(avg) ? "" : "opacity-30"}>★</span>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = dist[star] ?? 0;
          const pct = poll.total_votes > 0 ? Math.round((count / poll.total_votes) * 100) : 0;
          return (
            <div key={star} className="flex items-center gap-3 text-lg">
              <span className="w-20 text-right text-gray-400">{star} star{star !== 1 ? "s" : ""}</span>
              <div className="h-4 flex-1 rounded-full bg-gray-800">
                <div className="h-4 rounded-full bg-yellow-400 transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-10 text-right text-gray-400">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PresentationTextResponses({ responses }: { responses: string[] }) {
  if (responses.length === 0) return <p className="text-center text-xl text-gray-500">Waiting for responses...</p>;
  return (
    <div className="space-y-3 max-h-[60vh] overflow-y-auto">
      {responses.slice(0, 20).map((r, i) => (
        <div key={i} className="rounded-lg bg-gray-800 px-4 py-3 text-lg">{r}</div>
      ))}
      {responses.length > 20 && (
        <p className="text-center text-gray-500">+ {responses.length - 20} more responses</p>
      )}
    </div>
  );
}

function PresentationWordCloud({ frequencies }: { frequencies: Record<string, number> }) {
  const entries = Object.entries(frequencies).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return <p className="text-center text-xl text-gray-500">Waiting for responses...</p>;

  const maxCount = entries[0][1];
  const minSize = 1.25;
  const maxSize = 4;

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 py-4">
      {entries.map(([word, count]) => {
        const size = maxCount > 1
          ? minSize + ((count - 1) / (maxCount - 1)) * (maxSize - minSize)
          : (minSize + maxSize) / 2;
        return (
          <span key={word} className="text-white/80" style={{ fontSize: `${size}rem` }}>
            {word}
          </span>
        );
      })}
    </div>
  );
}
```

**Step 2: Create the route page**

```tsx
import { notFound } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/server";
import { getPollWithResults } from "@/features/polls/queries";
import { PollPresentationView } from "@/features/polls/components/poll-presentation-view";
import { WallRefreshWrapper } from "@/features/announcement-wall/components/wall-refresh-wrapper";

export default async function PollPresentPage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string; pollId: string }>;
}) {
  const { orgSlug, eventSlug, pollId } = await params;
  const supabase = await createClient();

  // Verify org + event exist
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("slug", orgSlug)
    .single();
  if (!org) notFound();

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("organization_id", org.id)
    .eq("slug", eventSlug)
    .eq("status", "published")
    .single();
  if (!event) notFound();

  const poll = await getPollWithResults(pollId);
  if (!poll || poll.event_id !== event.id) notFound();

  return (
    <WallRefreshWrapper intervalMs={5_000}>
      <PollPresentationView poll={poll} />
    </WallRefreshWrapper>
  );
}
```

**Step 3: Add "Present" button to PollList**

In `apps/web/src/features/polls/components/poll-list.tsx`, the organizer needs a way to get the presentation URL. Add a button in the actions column for open/closed polls.

The button needs the org slug and event slug — pass them as props or construct the URL from the event. Simplest: add `orgSlug` and `eventSlug` props to `PollList`.

Update the PollList props:

```typescript
export function PollList({
  polls,
  eventId,
  orgSlug,
  eventSlug,
}: {
  polls: PollWithResults[];
  eventId: string;
  orgSlug: string;
  eventSlug: string;
})
```

Add a "Present" button next to existing actions for open/closed polls:

```tsx
<button
  type="button"
  onClick={() => {
    const url = `${window.location.origin}/${orgSlug}/${eventSlug}/polls/${poll.id}/present`;
    window.open(url, "_blank");
  }}
  className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted/50"
>
  Present
</button>
```

Update the polls page (`apps/web/src/app/(organizer)/events/[eventId]/polls/page.tsx`) to fetch and pass `orgSlug` and `eventSlug`.

**Step 4: Run all tests**

Run: `cd apps/web && npx vitest run src/features/polls/`
Expected: All PASS

**Step 5: Commit**

```bash
git add apps/web/src/features/polls/components/poll-presentation-view.tsx \
  "apps/web/src/app/(public)/[orgSlug]/[eventSlug]/polls/[pollId]/present/page.tsx" \
  apps/web/src/features/polls/components/poll-list.tsx \
  apps/web/src/app/(organizer)/events/[eventId]/polls/page.tsx
git commit -m "feat(polls): add live presentation route and Present button for organizers"
```

---

### Task 9: Update Seed Data & Manual Testing

**Files:**
- Modify: `packages/supabase/seed/` — whichever seed file creates poll data

**Context:** Add seed polls for each new answer type so we can visually test all the new UIs.

**Step 1: Find and update the poll seed data**

Search for existing poll seed data:
```bash
grep -r "live_polls" packages/supabase/seed/
```

Add seed polls for each type:

```sql
-- Star rating poll
INSERT INTO public.live_polls (event_id, created_by, question, options, status, answer_type, show_results)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000099',
  'How would you rate this event?',
  '[]',
  'open',
  'star_rating',
  true
);

-- Short answer poll
INSERT INTO public.live_polls (event_id, created_by, question, options, status, answer_type, show_results)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000099',
  'What topic would you like covered next?',
  '[]',
  'open',
  'short_answer',
  true
);

-- Word cloud poll
INSERT INTO public.live_polls (event_id, created_by, question, options, status, answer_type, show_results)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000099',
  'Describe this event in one word',
  '[]',
  'open',
  'word_cloud',
  true
);

-- Checkbox poll
INSERT INTO public.live_polls (event_id, created_by, question, options, status, answer_type, show_results)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000099',
  'Which sessions did you attend? (select all)',
  '[{"id": "a", "text": "Opening Keynote"}, {"id": "b", "text": "Workshop A"}, {"id": "c", "text": "Workshop B"}, {"id": "d", "text": "Closing Panel"}]',
  'open',
  'checkbox',
  true
);
```

Adjust the UUIDs to match your actual seed event/user IDs. Check existing seed files for the pattern.

**Step 2: Apply seed**

Run: `npx supabase db query --local < packages/supabase/seed/<seed-file>.sql`

**Step 3: Manual test checklist**

1. Visit organizer polls page — verify all 5 types show in the table
2. Create a poll of each type — verify options editor hides for non-choice types
3. Visit attendee session page — verify each poll renders correct input UI
4. Vote on each type — verify vote records and results update
5. Expand each poll in organizer list — verify correct results visualization
6. Click "Present" on each poll — verify full-screen presentation renders
7. Download CSV — verify export handles all types

**Step 4: Commit**

```bash
git add packages/supabase/seed/
git commit -m "feat(polls): add seed data for all 5 poll answer types"
```

---

## Task Summary

| # | Task | Key Files |
|---|------|-----------|
| 1 | Database migration | `088_poll_answer_types.sql` |
| 2 | TypeScript types & queries | `queries.ts`, `queries.test.ts` |
| 3 | Server actions (create + vote) | `actions.ts`, `actions.test.ts` |
| 4 | CSV export | `export.ts`, `export.test.ts` |
| 5 | Poll creation forms (answer type selector) | `poll-creator.tsx`, `add-poll-dialog.tsx` |
| 6 | Attendee voting UI (type-specific) | `session-poll-card.tsx`, session page |
| 7 | Results display (type-specific) | `poll-results-chart.tsx`, `poll-list.tsx` |
| 8 | Live presentation route | `poll-presentation-view.tsx`, route page, `poll-list.tsx` |
| 9 | Seed data & manual testing | seed SQL |

# Speaker Manager Enhancement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the Speaker Manager from a simple card grid into a full-featured management page with stats, table view (default) + card view toggle, search, filters, export CSV, settings link, and email reminder (coming soon).

**Architecture:** Rewrite `speaker-list.tsx` into a new `speaker-manager.tsx` component that includes stats bar, toolbar (actions + search + filters + view toggle), table view (default), card view, and CSV export. Keep existing `speaker-form.tsx` and `speaker-csv-import.tsx` unchanged. Add Settings coming-soon page. Update `speakers/page.tsx` to use the new component.

**Tech Stack:** React 19, Next.js 16, Supabase, Tailwind 4, Lucide icons, Sonner toasts

---

### Task 1: Write failing test for SpeakerManager stats

**Files:**
- Create: `apps/web/src/features/speakers/components/speaker-manager.test.tsx`

**Step 1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SpeakerManager } from "./speaker-manager";

const mockSpeakers = [
  {
    id: "s1", name: "Alice", title: "CTO", company: "Acme", bio: "Bio here",
    photo: "https://example.com/alice.jpg", email: "alice@test.com",
    linkedin_url: null, twitter_handle: null, website_url: null,
    is_featured: true,
  },
  {
    id: "s2", name: "Bob", title: null, company: null, bio: null,
    photo: null, email: "bob@test.com",
    linkedin_url: null, twitter_handle: null, website_url: null,
    is_featured: false,
  },
  {
    id: "s3", name: "Carol", title: "VP", company: "BigCo", bio: "Speaker bio",
    photo: "https://example.com/carol.jpg", email: null,
    linkedin_url: "https://linkedin.com/in/carol", twitter_handle: null, website_url: null,
    is_featured: true,
  },
];

describe("SpeakerManager", () => {
  it("renders stat cards with correct counts", () => {
    render(<SpeakerManager eventId="evt-1" initialSpeakers={mockSpeakers} />);

    // Total speakers
    expect(screen.getByText("3")).toBeInTheDocument();
    // Featured (Alice + Carol)
    expect(screen.getByText("2")).toBeInTheDocument();
    // Complete profiles (Alice has photo+bio+company, Carol has photo+bio+company)
    // Bob has none of those
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter web exec vitest run src/features/speakers/components/speaker-manager.test.tsx`
Expected: FAIL - module not found

---

### Task 2: Implement SpeakerManager component - stats + toolbar + table view

**Files:**
- Create: `apps/web/src/features/speakers/components/speaker-manager.tsx`

**Step 3: Write the full SpeakerManager component**

Key implementation details:
- Use `useState<"table" | "cards">` defaulting to `"table"`
- Stats bar: Total Speakers, Complete Profiles (has photo + bio + company), Featured Speakers
- Use same stat card pattern as `registrations-table.tsx` (Card with gradient, icon, count)
- Toolbar row: Add Speaker + Import CSV + Settings (link) + Export Speakers + Email Reminder (coming soon toast)
- Search: filter by name or email (same pattern as `registrations-table.tsx`)
- Filter dropdown: All Speakers, Has Photo, No Photo, Has Sessions, No Sessions, Featured
- View toggle: table/card icons using `List`/`LayoutGrid` from lucide (same pattern as `events-list.tsx`)
- Table: checkbox column, Speaker (avatar + name + subtitle), Email, Company, Featured star, Edit/Delete actions
- Card view: reuse existing card grid markup from current `speaker-list.tsx`
- CSV export: same `exportCsv()` pattern as `registrations-table.tsx`
- Email Reminder button: `toast.info("Email reminder coming soon")`
- Reuse existing `SpeakerForm` modal and `SpeakerCsvImport` for add/edit/import
- Reuse existing `createSpeaker`, `updateSpeaker`, `deleteSpeaker` actions
- Reuse existing `useConfirm` for delete confirmation

Icons for stats:
- Total: `Users` (slate gradient)
- Complete Profiles: `UserCheck` (emerald gradient)
- Featured: `Star` (amber gradient)

Icons for toolbar:
- Settings: `Settings` icon, links to `/events/${eventId}/speakers/settings`
- Export: `Download` icon
- Email Reminder: `Mail` icon

**Step 4: Run test to verify it passes**

Run: `pnpm --filter web exec vitest run src/features/speakers/components/speaker-manager.test.tsx`
Expected: PASS

---

### Task 3: Add more tests for search, filter, view toggle, export

**Files:**
- Modify: `apps/web/src/features/speakers/components/speaker-manager.test.tsx`

**Step 5: Add search test**

```tsx
it("filters speakers by search text", async () => {
  const { user } = renderWithUser(
    <SpeakerManager eventId="evt-1" initialSpeakers={mockSpeakers} />
  );
  const search = screen.getByPlaceholderText("Search by name or email...");
  await user.type(search, "alice");
  expect(screen.getByText("Alice")).toBeInTheDocument();
  expect(screen.queryByText("Bob")).not.toBeInTheDocument();
});
```

**Step 6: Add view toggle test**

```tsx
it("toggles between table and card view", async () => {
  render(<SpeakerManager eventId="evt-1" initialSpeakers={mockSpeakers} />);
  // Default is table - should have table element
  expect(screen.getByRole("table")).toBeInTheDocument();
  // Click card view button
  const cardBtn = screen.getByTitle("Card view");
  await userEvent.click(cardBtn);
  // Table should be gone
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
});
```

**Step 7: Add export test**

```tsx
it("renders export speakers button", () => {
  render(<SpeakerManager eventId="evt-1" initialSpeakers={mockSpeakers} />);
  expect(screen.getByText("Export")).toBeInTheDocument();
});
```

**Step 8: Add email reminder coming soon test**

```tsx
it("renders email reminder button", () => {
  render(<SpeakerManager eventId="evt-1" initialSpeakers={mockSpeakers} />);
  expect(screen.getByText("Email Reminder")).toBeInTheDocument();
});
```

**Step 9: Run all tests**

Run: `pnpm --filter web exec vitest run src/features/speakers/components/speaker-manager.test.tsx`
Expected: All PASS

---

### Task 4: Create Settings coming-soon page

**Files:**
- Create: `apps/web/src/app/(organizer)/events/[eventId]/speakers/settings/page.tsx`

**Step 10: Create the settings page**

```tsx
import { Settings } from "lucide-react";
import { ComingSoon } from "@/features/speakers/components/coming-soon";

export default function SpeakerSettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Speaker Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure the speaker form, notification preferences, and collection fields.
        </p>
      </div>
      <ComingSoon
        title="Speaker Form Settings"
        description="Customize which fields to collect from speakers, set up speaker form emails, and configure notification preferences for profile updates."
        icon={<Settings className="h-7 w-7" />}
      />
    </div>
  );
}
```

---

### Task 5: Add Settings to Speaker Center submenu

**Files:**
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/layout.tsx`

**Step 11: Add Settings child to Speaker Center**

Add to the Speaker Center children array, after "Release & Consent Forms":
```tsx
{ href: `/events/${eventId}/speakers/settings`, label: "Settings" },
```

---

### Task 6: Update speakers/page.tsx to use SpeakerManager

**Files:**
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/speakers/page.tsx`

**Step 12: Replace SpeakerList with SpeakerManager**

```tsx
import { getSpeakersByEvent } from "@/features/speakers/queries";
import { SpeakerManager } from "@/features/speakers/components/speaker-manager";

export default async function SpeakerManagerPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const speakers = await getSpeakersByEvent(eventId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Speaker Manager</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add and manage speakers for your event. Send speaker forms to collect bios, photos, and session details.
        </p>
      </div>
      <SpeakerManager eventId={eventId} initialSpeakers={speakers} />
    </div>
  );
}
```

---

### Task 7: Update revalidatePath in actions.ts

**Files:**
- Modify: `apps/web/src/features/speakers/actions.ts`

**Step 13: Add speakers path revalidation**

In `createSpeaker`, `updateSpeaker`, `deleteSpeaker`, and `bulkImportSpeakers`, add alongside existing revalidatePath:
```tsx
revalidatePath(`/events/${eventId}/speakers`);
```

---

### Task 8: Run full test suite and TypeScript check

**Step 14: Run all speaker tests**

Run: `pnpm --filter web exec vitest run src/features/speakers/`
Expected: All tests PASS

**Step 15: TypeScript check**

Run: `pnpm --filter web exec tsc --noEmit --pretty 2>&1 | grep speakers`
Expected: No errors

---

### Task 9: Commit

**Step 16: Commit all changes**

```bash
git add apps/web/src/features/speakers/components/speaker-manager.tsx \
       apps/web/src/features/speakers/components/speaker-manager.test.tsx \
       apps/web/src/app/\(organizer\)/events/\[eventId\]/speakers/page.tsx \
       apps/web/src/app/\(organizer\)/events/\[eventId\]/speakers/settings/page.tsx \
       apps/web/src/app/\(organizer\)/events/\[eventId\]/layout.tsx \
       apps/web/src/features/speakers/actions.ts

git commit -m "feat(speakers): enhanced Speaker Manager with table/card view, stats, search, filters, export CSV, settings page"
```

# Abandoned Registration Recovery Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Automatically detect incomplete registrations and send recovery emails to bring users back to complete their registration.

**Architecture:** New `registration_intents` table tracks when users start but don't complete registration. A cron job sends recovery emails after a configurable delay. Organizer controls live in the Marketing tab.

**Tech Stack:** Next.js 16 Server Actions, Supabase (PostgreSQL + RLS), react-email templates, Resend for delivery, existing cron pattern.

---

### Task 1: Database Migration — `registration_intents` table + event recovery columns

**Files:**
- Create: `packages/supabase/migrations/035_registration_intents.sql`

**Step 1: Write the migration**

```sql
-- =============================================================================
-- Registration Intents: tracks incomplete registrations for recovery emails
-- =============================================================================

CREATE TABLE public.registration_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  ticket_type_id UUID NOT NULL REFERENCES public.ticket_types(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  custom_fields JSONB DEFAULT '{}',
  promo_code_id UUID REFERENCES public.promo_codes(id) ON DELETE SET NULL,
  converted_registration_id UUID REFERENCES public.registrations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'converted', 'expired')),
  recovery_emails_sent INT NOT NULL DEFAULT 0,
  last_recovery_email_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, email)
);

-- Indexes
CREATE INDEX idx_registration_intents_event_id ON public.registration_intents(event_id);
CREATE INDEX idx_registration_intents_status ON public.registration_intents(status);
CREATE INDEX idx_registration_intents_email ON public.registration_intents(email);

-- RLS
ALTER TABLE public.registration_intents ENABLE ROW LEVEL SECURITY;

-- Grants: anon can insert (public registration pages), authenticated can read
GRANT SELECT, INSERT, UPDATE ON public.registration_intents TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registration_intents TO authenticated;

-- Service role needs full access for cron job
GRANT ALL ON public.registration_intents TO service_role;

-- Anon can insert intents (from public registration pages)
CREATE POLICY "Anyone can create registration intents"
  ON public.registration_intents FOR INSERT TO anon
  WITH CHECK (true);

-- Anon can update their own intents (upsert by email)
CREATE POLICY "Anyone can update own registration intents"
  ON public.registration_intents FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- Org members can view intents for their events
CREATE POLICY "Org members can view registration intents"
  ON public.registration_intents FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE e.id = registration_intents.event_id AND om.user_id = auth.uid()
    )
  );

-- Org members can manage intents
CREATE POLICY "Org members can manage registration intents"
  ON public.registration_intents FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE e.id = registration_intents.event_id AND om.user_id = auth.uid()
    )
  );

-- Add recovery settings to events table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS recovery_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS recovery_delay_hours INT NOT NULL DEFAULT 1;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS recovery_email_count INT NOT NULL DEFAULT 2;
```

**Step 2: Run the migration**

Run: `npx supabase migration up`
Expected: Migration applies successfully.

**Step 3: Commit**

```bash
git add packages/supabase/migrations/035_registration_intents.sql
git commit -m "feat: add registration_intents table and recovery settings columns"
```

---

### Task 2: Server Action — `trackRegistrationIntent()`

**Files:**
- Create: `apps/web/src/features/registration/intent-actions.ts`
- Test: `apps/web/src/features/registration/intent-actions.test.ts`

**Step 1: Write the failing test**

```typescript
// intent-actions.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase
const mockUpsert = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockFrom = vi.fn();

vi.mock("@attendly/ui/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      from: mockFrom,
    })
  ),
}));

describe("trackRegistrationIntent", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: upsert succeeds
    mockFrom.mockReturnValue({
      upsert: mockUpsert.mockReturnValue({
        select: mockSelect.mockReturnValue({
          single: mockSingle.mockResolvedValue({
            data: { id: "intent-1" },
            error: null,
          }),
        }),
      }),
    });
  });

  it("upserts a registration intent with event_id, ticket_type_id, and email", async () => {
    const { trackRegistrationIntent } = await import("./intent-actions");

    const result = await trackRegistrationIntent({
      event_id: "event-1",
      ticket_type_id: "ticket-1",
      email: "test@example.com",
    });

    expect(result).toEqual({ id: "intent-1" });
    expect(mockFrom).toHaveBeenCalledWith("registration_intents");
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        event_id: "event-1",
        ticket_type_id: "ticket-1",
        email: "test@example.com",
        status: "pending",
      }),
      expect.objectContaining({
        onConflict: "event_id,email",
      })
    );
  });

  it("includes optional name and custom_fields when provided", async () => {
    const { trackRegistrationIntent } = await import("./intent-actions");

    await trackRegistrationIntent({
      event_id: "event-1",
      ticket_type_id: "ticket-1",
      email: "test@example.com",
      name: "Jane",
      custom_fields: { company: "Acme" },
    });

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Jane",
        custom_fields: { company: "Acme" },
      }),
      expect.anything()
    );
  });

  it("throws on supabase error", async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: "DB error" },
    });

    const { trackRegistrationIntent } = await import("./intent-actions");

    await expect(
      trackRegistrationIntent({
        event_id: "event-1",
        ticket_type_id: "ticket-1",
        email: "bad@example.com",
      })
    ).rejects.toThrow("DB error");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run src/features/registration/intent-actions.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

```typescript
// intent-actions.ts
"use server";

import { createClient } from "@attendly/ui/supabase/server";

export async function trackRegistrationIntent(data: {
  event_id: string;
  ticket_type_id: string;
  email: string;
  name?: string;
  custom_fields?: Record<string, unknown>;
  promo_code_id?: string;
}) {
  const supabase = await createClient();

  const { data: intent, error } = await supabase
    .from("registration_intents")
    .upsert(
      {
        event_id: data.event_id,
        ticket_type_id: data.ticket_type_id,
        email: data.email.toLowerCase().trim(),
        name: data.name ?? null,
        custom_fields: data.custom_fields ?? {},
        promo_code_id: data.promo_code_id ?? null,
        status: "pending",
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "event_id,email",
        ignoreDuplicates: false,
      }
    )
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return intent;
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/web && npx vitest run src/features/registration/intent-actions.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/features/registration/intent-actions.ts apps/web/src/features/registration/intent-actions.test.ts
git commit -m "feat: add trackRegistrationIntent server action with tests"
```

---

### Task 3: Modify `registerForEvent()` to convert intents

**Files:**
- Modify: `apps/web/src/features/registration/actions.ts` (lines 119-123, after successful insert)

**Step 1: Write the failing test**

Add to existing `apps/web/src/features/registration/actions.test.ts`:

```typescript
it("marks matching registration intent as converted on successful registration", async () => {
  // After successful registration, should update registration_intents
  // where event_id and email match, setting status to 'converted'
  // and converted_registration_id to the new registration id

  // ... test that supabase.from("registration_intents").update() is called
  // with { status: "converted" } and matching event_id + email
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/web && npx vitest run src/features/registration/actions.test.ts`
Expected: FAIL — intent conversion not happening

**Step 3: Add intent conversion to `registerForEvent()`**

After the successful `.insert()` into registrations (around line 123 in `actions.ts`), add:

```typescript
  // Mark any matching registration intent as converted
  // Fire-and-forget — don't block the registration on this
  supabase
    .from("registration_intents")
    .update({
      status: "converted",
      updated_at: new Date().toISOString(),
    })
    .eq("event_id", data.event_id)
    .eq("email", data.email.toLowerCase().trim())
    .eq("status", "pending")
    .then(() => {});
```

**Step 4: Run test to verify it passes**

Run: `cd apps/web && npx vitest run src/features/registration/actions.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/web/src/features/registration/actions.ts apps/web/src/features/registration/actions.test.ts
git commit -m "feat: mark registration intents as converted on successful registration"
```

---

### Task 4: Client-Side Intent Tracking in `RegistrationFlow`

**Files:**
- Modify: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/register/registration-flow.tsx`

**Step 1: Add intent tracking on email blur**

After the email `<Input>` field (around line 308), the `onChange` currently just calls `setEmail()`. Add a `useCallback` + `onBlur` handler:

```typescript
// Add to imports
import { trackRegistrationIntent } from "@/features/registration/intent-actions";
import { useCallback, useRef } from "react";

// Add inside the component, after state declarations:
const intentTracked = useRef<string | null>(null);

const handleEmailBlur = useCallback(async () => {
  // Only track if we have a valid email and selected ticket
  const trimmedEmail = email.trim().toLowerCase();
  if (!selectedTicket || !trimmedEmail || !trimmedEmail.includes("@")) return;
  // Don't re-track the same email
  if (intentTracked.current === trimmedEmail) return;

  intentTracked.current = trimmedEmail;
  try {
    await trackRegistrationIntent({
      event_id: eventId,
      ticket_type_id: selectedTicket,
      email: trimmedEmail,
      name: name || undefined,
    });
  } catch {
    // Silent fail — intent tracking should never block UX
  }
}, [email, selectedTicket, name, eventId]);
```

Then update the email Input to include `onBlur={handleEmailBlur}`.

Also add `onBlur` intent tracking when a ticket is selected and email already entered. Update the ticket selection `onClick`:

```typescript
onClick={() => {
  if (!soldOut) {
    setSelectedTicket(ticket.id);
    // If email already entered, track intent with new ticket
    const trimmedEmail = email.trim().toLowerCase();
    if (trimmedEmail && trimmedEmail.includes("@")) {
      intentTracked.current = null; // Reset to re-track with new ticket
    }
  }
}}
```

**Step 2: Add intent pre-fill support**

Add a new prop to `RegistrationFlow`:

```typescript
export function RegistrationFlow({
  eventId,
  tickets,
  customFields = [],
  initialIntent,
}: {
  eventId: string;
  tickets: TicketType[];
  customFields?: CustomFieldDef[];
  initialIntent?: {
    ticket_type_id: string;
    email: string;
    name?: string;
    custom_fields?: Record<string, string | boolean>;
  };
})
```

Initialize state from `initialIntent` if provided:

```typescript
const [selectedTicket, setSelectedTicket] = useState<string | null>(
  initialIntent?.ticket_type_id ?? null
);
const [name, setName] = useState(initialIntent?.name ?? "");
const [email, setEmail] = useState(initialIntent?.email ?? "");
const [customValues, setCustomValues] = useState<Record<string, string | boolean>>(
  initialIntent?.custom_fields ?? {}
);
```

**Step 3: Update public register page to pass intent data**

Modify `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/register/page.tsx`:

```typescript
// In the page component, read intent search param
const intentId = searchParams?.intent;
let initialIntent;

if (intentId) {
  const { data: intent } = await supabase
    .from("registration_intents")
    .select("ticket_type_id, email, name, custom_fields")
    .eq("id", intentId)
    .eq("status", "pending")
    .single();

  if (intent) {
    initialIntent = {
      ticket_type_id: intent.ticket_type_id,
      email: intent.email,
      name: intent.name ?? undefined,
      custom_fields: intent.custom_fields as Record<string, string | boolean> | undefined,
    };
  }
}

// Pass to RegistrationFlow
<RegistrationFlow
  eventId={event.id}
  tickets={tickets}
  customFields={customFields}
  initialIntent={initialIntent}
/>
```

**Step 4: Verify the app compiles**

Run: `cd apps/web && npx next build --no-lint` (or check with `npx tsc --noEmit`)
Expected: No type errors

**Step 5: Commit**

```bash
git add apps/web/src/app/(public)/[orgSlug]/[eventSlug]/register/registration-flow.tsx \
  apps/web/src/app/(public)/[orgSlug]/[eventSlug]/register/page.tsx
git commit -m "feat: add intent tracking on email blur and pre-fill from recovery link"
```

---

### Task 5: Recovery Email Template

**Files:**
- Create: `apps/web/src/features/emails/lib/templates/recovery-email.tsx`

**Step 1: Write the recovery email template**

Follow the same pattern as `event-reminder.tsx`:

```tsx
import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Hr,
  Link,
} from "@react-email/components";

type Props = {
  eventName: string;
  eventDate: string;
  venueName?: string;
  ticketName: string;
  registrationUrl: string;
  unsubscribeUrl: string;
};

export function RecoveryEmail({
  eventName = "Event",
  eventDate = "",
  venueName,
  ticketName = "General",
  registrationUrl = "#",
  unsubscribeUrl = "#",
}: Props) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "system-ui, sans-serif", backgroundColor: "#f9fafb" }}>
        <Container style={{ maxWidth: "520px", margin: "40px auto", backgroundColor: "#fff", borderRadius: "8px", padding: "32px" }}>
          <Heading style={{ fontSize: "20px", marginBottom: "16px" }}>
            Complete your registration
          </Heading>
          <Text style={{ fontSize: "14px", color: "#374151" }}>
            You started registering for <strong>{eventName}</strong> but didn&apos;t finish.
            Your spot is still available!
          </Text>
          <Text style={{ fontSize: "14px", color: "#374151" }}>
            <strong>When:</strong> {eventDate}
          </Text>
          {venueName && (
            <Text style={{ fontSize: "14px", color: "#374151" }}>
              <strong>Where:</strong> {venueName}
            </Text>
          )}
          <Text style={{ fontSize: "14px", color: "#374151" }}>
            <strong>Ticket:</strong> {ticketName}
          </Text>
          <Button
            href={registrationUrl}
            style={{
              backgroundColor: "#18181b",
              color: "#fff",
              padding: "12px 24px",
              borderRadius: "6px",
              fontSize: "14px",
              textDecoration: "none",
              marginTop: "16px",
              display: "inline-block",
            }}
          >
            Complete Registration
          </Button>
          <Hr style={{ margin: "24px 0", borderColor: "#e5e7eb" }} />
          <Text style={{ fontSize: "12px", color: "#9ca3af" }}>
            If you&apos;ve already registered, you can ignore this email.
          </Text>
          <Link href={unsubscribeUrl} style={{ fontSize: "12px", color: "#9ca3af" }}>
            Don&apos;t want these emails? Unsubscribe
          </Link>
          <Text style={{ fontSize: "11px", color: "#d1d5db", marginTop: "8px" }}>
            Evenstry - Event Management Platform
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/emails/lib/templates/recovery-email.tsx
git commit -m "feat: add recovery email template for abandoned registrations"
```

---

### Task 6: Recovery Cron Job

**Files:**
- Create: `apps/web/src/app/api/cron/registration-recovery/route.ts`

**Step 1: Write the cron route**

Follow the same pattern as `apps/web/src/app/api/cron/email-reminders/route.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";
import { getResend } from "@/features/emails/lib/resend";
import { render } from "@react-email/components";
import { RecoveryEmail } from "@/features/emails/lib/templates/recovery-email";
import { generateUnsubscribeToken } from "@/features/emails/lib/unsubscribe";

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Recovery email schedule: delays in hours after intent creation
const RECOVERY_SCHEDULE = [
  0,   // 1st email: at recovery_delay_hours
  24,  // 2nd email: 24h after first
  72,  // 3rd email: 72h after first (3 days)
];

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();
  let sent = 0;
  let skipped = 0;

  // Find events with recovery enabled
  const { data: events } = await supabase
    .from("events")
    .select("id, title, start_date, end_date, venue_name, slug, organization_id, recovery_delay_hours, recovery_email_count, organizations(slug)")
    .eq("recovery_enabled", true)
    .eq("status", "published");

  if (!events || events.length === 0) {
    return Response.json({ ok: true, sent: 0, skipped: 0 });
  }

  for (const event of events) {
    // Don't send recovery emails after the event has ended
    if (new Date(event.end_date) < now) continue;

    // Find pending intents for this event
    const { data: intents } = await supabase
      .from("registration_intents")
      .select("id, email, name, ticket_type_id, recovery_emails_sent, last_recovery_email_at, created_at, ticket_types(name)")
      .eq("event_id", event.id)
      .eq("status", "pending")
      .lt("recovery_emails_sent", event.recovery_email_count);

    if (!intents || intents.length === 0) continue;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.evenstry.com";
    const orgSlug = (event.organizations as any)?.slug ?? "";

    for (const intent of intents) {
      const emailIndex = intent.recovery_emails_sent; // 0-based
      const delayHours = event.recovery_delay_hours + (RECOVERY_SCHEDULE[emailIndex] ?? 0);
      const sendAfter = new Date(intent.created_at);
      sendAfter.setHours(sendAfter.getHours() + delayHours);

      // Not yet time to send
      if (now < sendAfter) {
        skipped++;
        continue;
      }

      // If we sent the last email too recently (< 1h), skip to avoid duplicate
      if (intent.last_recovery_email_at) {
        const lastSent = new Date(intent.last_recovery_email_at);
        if (now.getTime() - lastSent.getTime() < 60 * 60 * 1000) {
          skipped++;
          continue;
        }
      }

      // Check if they've since registered (belt and suspenders)
      const { data: existingReg } = await supabase
        .from("registrations")
        .select("id")
        .eq("event_id", event.id)
        .eq("email", intent.email)
        .in("status", ["confirmed", "checked_in"])
        .limit(1);

      if (existingReg && existingReg.length > 0) {
        // They registered — mark intent as converted
        await supabase
          .from("registration_intents")
          .update({ status: "converted", updated_at: now.toISOString() })
          .eq("id", intent.id);
        continue;
      }

      // Build recovery URL
      const registrationUrl = `${baseUrl}/${orgSlug}/${event.slug}/register?intent=${intent.id}`;

      // Generate unsubscribe token
      const unsubToken = await generateUnsubscribeToken({ email: intent.email });
      const unsubscribeUrl = `${baseUrl}/api/unsubscribe?token=${unsubToken}`;

      const ticketName = (intent.ticket_types as any)?.name ?? "General";

      const html = await render(
        RecoveryEmail({
          eventName: event.title,
          eventDate: new Date(event.start_date).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }),
          venueName: event.venue_name ?? undefined,
          ticketName,
          registrationUrl,
          unsubscribeUrl,
        })
      );

      const subject = emailIndex === 0
        ? `Complete your registration for ${event.title}`
        : emailIndex === 1
          ? `Your spot is still available — ${event.title}`
          : `Last chance to register for ${event.title}`;

      const { data: sentData, error: sendError } = await getResend().emails.send({
        from: process.env.EMAIL_FROM || "Evenstry <onboarding@resend.dev>",
        to: intent.email,
        subject,
        html,
      });

      // Log to email_logs
      await supabase.from("email_logs").insert({
        organization_id: event.organization_id,
        event_id: event.id,
        recipient_email: intent.email,
        recipient_name: intent.name,
        subject,
        status: sendError ? "failed" : "sent",
        resend_id: sentData?.id ?? null,
        sent_at: sendError ? null : now.toISOString(),
        error: sendError?.message ?? null,
      });

      // Update intent
      await supabase
        .from("registration_intents")
        .update({
          recovery_emails_sent: intent.recovery_emails_sent + 1,
          last_recovery_email_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("id", intent.id);

      if (!sendError) sent++;
    }
  }

  return Response.json({ ok: true, sent, skipped, timestamp: now.toISOString() });
}
```

**Step 2: Commit**

```bash
git add apps/web/src/app/api/cron/registration-recovery/route.ts
git commit -m "feat: add registration recovery cron job"
```

---

### Task 7: Organizer UI — Recovery Settings in Marketing Tab

**Files:**
- Create: `apps/web/src/features/registration/components/recovery-settings.tsx`
- Create: `apps/web/src/features/registration/recovery-actions.ts`
- Create: `apps/web/src/features/registration/recovery-queries.ts`
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/marketing/page.tsx`

**Step 1: Write the recovery queries**

```typescript
// recovery-queries.ts
import { createClient } from "@attendly/ui/supabase/server";

export async function getRecoverySettings(eventId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select("recovery_enabled, recovery_delay_hours, recovery_email_count")
    .eq("id", eventId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function getRecoveryStats(eventId: string) {
  const supabase = await createClient();

  const { data: intents, error } = await supabase
    .from("registration_intents")
    .select("status, recovery_emails_sent")
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);

  const stats = {
    total: intents.length,
    pending: 0,
    converted: 0,
    expired: 0,
    emailsSent: 0,
  };

  for (const intent of intents) {
    if (intent.status === "pending") stats.pending++;
    else if (intent.status === "converted") stats.converted++;
    else if (intent.status === "expired") stats.expired++;
    stats.emailsSent += intent.recovery_emails_sent;
  }

  return stats;
}
```

**Step 2: Write the recovery server action**

```typescript
// recovery-actions.ts
"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateRecoverySettings(
  eventId: string,
  settings: {
    recovery_enabled: boolean;
    recovery_delay_hours: number;
    recovery_email_count: number;
  }
) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { error } = await supabase
    .from("events")
    .update({
      recovery_enabled: settings.recovery_enabled,
      recovery_delay_hours: settings.recovery_delay_hours,
      recovery_email_count: Math.min(3, Math.max(1, settings.recovery_email_count)),
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId);

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/marketing`);
}
```

**Step 3: Write the recovery settings component**

```tsx
// recovery-settings.tsx
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updateRecoverySettings } from "@/features/registration/recovery-actions";
import { Button, Switch, Label } from "@attendly/ui/components";
import { Mail, TrendingUp, Clock, Send } from "lucide-react";

type RecoveryStats = {
  total: number;
  pending: number;
  converted: number;
  expired: number;
  emailsSent: number;
};

type Props = {
  eventId: string;
  initialSettings: {
    recovery_enabled: boolean;
    recovery_delay_hours: number;
    recovery_email_count: number;
  };
  stats: RecoveryStats;
};

const DELAY_OPTIONS = [
  { value: 1, label: "1 hour" },
  { value: 2, label: "2 hours" },
  { value: 4, label: "4 hours" },
  { value: 24, label: "24 hours" },
];

export function RecoverySettings({ eventId, initialSettings, stats }: Props) {
  const [enabled, setEnabled] = useState(initialSettings.recovery_enabled);
  const [delayHours, setDelayHours] = useState(initialSettings.recovery_delay_hours);
  const [emailCount, setEmailCount] = useState(initialSettings.recovery_email_count);
  const [saving, setSaving] = useState(false);

  const conversionRate = stats.total > 0
    ? Math.round((stats.converted / stats.total) * 100)
    : 0;

  async function handleSave() {
    setSaving(true);
    try {
      await updateRecoverySettings(eventId, {
        recovery_enabled: enabled,
        recovery_delay_hours: delayHours,
        recovery_email_count: emailCount,
      });
      toast.success("Recovery settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Abandoned Registration Recovery
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Automatically email visitors who started registering but didn&apos;t finish.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="recovery-toggle" className="text-sm">
            {enabled ? "Enabled" : "Disabled"}
          </Label>
          <Switch
            id="recovery-toggle"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>
      </div>

      {/* Stats cards */}
      {stats.total > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Intents Captured</p>
            <p className="text-xl font-semibold">{stats.total}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Send className="h-3 w-3" /> Emails Sent
            </p>
            <p className="text-xl font-semibold">{stats.emailsSent}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Conversions
            </p>
            <p className="text-xl font-semibold">{stats.converted}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Conversion Rate</p>
            <p className="text-xl font-semibold">{conversionRate}%</p>
          </div>
        </div>
      )}

      {enabled && (
        <div className="space-y-4">
          {/* Delay selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              Wait before first email
            </Label>
            <div className="flex gap-2">
              {DELAY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDelayHours(opt.value)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    delayHours === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "hover:border-foreground/20"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Email count */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Number of recovery emails</Label>
            <div className="flex gap-2">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  onClick={() => setEmailCount(n)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    emailCount === n
                      ? "border-primary bg-primary/10 text-primary"
                      : "hover:border-foreground/20"
                  }`}
                >
                  {n} email{n > 1 ? "s" : ""}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {emailCount === 1 && "One email sent after the delay period."}
              {emailCount === 2 && "First email after delay, second email 24 hours later."}
              {emailCount === 3 && "First email after delay, second at 24h, third at 72h."}
            </p>
          </div>
        </div>
      )}

      <Button onClick={handleSave} loading={saving} size="sm">
        Save Settings
      </Button>
    </div>
  );
}
```

**Step 4: Update Marketing page to include recovery settings**

Modify `apps/web/src/app/(organizer)/events/[eventId]/marketing/page.tsx`:

```tsx
import { WidgetConfigurator } from "@/features/widgets/components/widget-configurator";
import { RecoverySettings } from "@/features/registration/components/recovery-settings";
import { getRecoverySettings, getRecoveryStats } from "@/features/registration/recovery-queries";

export default async function MarketingPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const [recoverySettings, recoveryStats] = await Promise.all([
    getRecoverySettings(eventId),
    getRecoveryStats(eventId),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold">Marketing</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Embed your event content on external websites and recover abandoned registrations.
        </p>
      </div>

      <RecoverySettings
        eventId={eventId}
        initialSettings={recoverySettings}
        stats={recoveryStats}
      />

      {/* ... existing WidgetConfigurator sections unchanged ... */}
    </div>
  );
}
```

**Step 5: Verify the app compiles**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No type errors

**Step 6: Commit**

```bash
git add apps/web/src/features/registration/components/recovery-settings.tsx \
  apps/web/src/features/registration/recovery-actions.ts \
  apps/web/src/features/registration/recovery-queries.ts \
  apps/web/src/app/(organizer)/events/[eventId]/marketing/page.tsx
git commit -m "feat: add recovery settings UI to Marketing tab with stats dashboard"
```

---

### Task 8: Unsubscribe Handling for Recovery Emails

**Files:**
- Modify: `apps/web/src/features/emails/lib/unsubscribe.ts` (extend payload type)
- Check: existing unsubscribe API route handles intent expiration

**Step 1: Extend unsubscribe to support intent expiration**

The existing `UnsubscribePayload` has `email`, `contactListId?`, `registrationId?`. We need to check whether the existing unsubscribe API route can handle recovery intents.

If the unsubscribe route already marks `registrations.unsubscribed = true` by email, we also need it to expire matching `registration_intents`.

Add to the unsubscribe API handler (wherever it processes the token):

```typescript
// After handling existing unsubscribe logic...
// Also expire any pending registration intents for this email
await supabase
  .from("registration_intents")
  .update({ status: "expired", updated_at: new Date().toISOString() })
  .eq("email", payload.email)
  .eq("status", "pending");
```

**Step 2: Commit**

```bash
git add <modified unsubscribe files>
git commit -m "feat: expire registration intents on unsubscribe"
```

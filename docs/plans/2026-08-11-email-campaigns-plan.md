# Email Campaigns Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Whova-style email campaigns to Attendly — contact list management, campaign composer with live preview, send tracking, and unsubscribe handling.

**Architecture:** New DB tables for contact_lists, contacts, and email_campaigns. Server actions for CRUD + sending. Campaign composer as a full-page form with live preview. Unsubscribe via signed JWT tokens. Restructured Emails tab showing campaigns, automations, and logs.

**Tech Stack:** Supabase (PostgreSQL + RLS), Next.js 16 server actions, React Email, Resend API, jose (JWT), Vitest

---

### Task 1: Database Migration — Contact Lists, Contacts, Campaigns

**Files:**
- Create: `packages/supabase/migrations/033_email_campaigns.sql`

**Step 1: Write the migration SQL**

```sql
-- ============================================================
-- Email Campaigns: Contact Lists, Contacts, Campaigns
-- ============================================================

-- Contact Lists (per organization)
CREATE TABLE public.contact_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contacts (within a list)
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_list_id UUID NOT NULL REFERENCES public.contact_lists(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  unsubscribed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contact_list_id, email)
);

-- Email Campaigns
CREATE TABLE public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL DEFAULT '',
  sender_name TEXT,
  reply_to TEXT,
  recipient_source TEXT NOT NULL DEFAULT 'registrants',
  contact_list_id UUID REFERENCES public.contact_lists(id) ON DELETE SET NULL,
  segment_filters JSONB,
  include_cta BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'draft',
  sent_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add campaign_id to email_logs
ALTER TABLE public.email_logs ADD COLUMN campaign_id UUID REFERENCES public.email_campaigns(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE public.contact_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_lists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_campaigns TO authenticated;

-- Contact Lists: org members can manage
CREATE POLICY "Org members manage contact lists" ON public.contact_lists FOR ALL TO authenticated
  USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));

-- Contacts: org members can manage (via join to contact_lists)
CREATE POLICY "Org members manage contacts" ON public.contacts FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM contact_lists cl WHERE cl.id = contacts.contact_list_id
    AND is_org_member(cl.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM contact_lists cl WHERE cl.id = contacts.contact_list_id
    AND is_org_member(cl.organization_id)
  ));

-- Email Campaigns: org members can manage (via join to events)
CREATE POLICY "Org members manage campaigns" ON public.email_campaigns FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e WHERE e.id = email_campaigns.event_id
    AND is_org_member(e.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM events e WHERE e.id = email_campaigns.event_id
    AND is_org_member(e.organization_id)
  ));

-- Indexes
CREATE INDEX idx_contact_lists_org ON public.contact_lists(organization_id);
CREATE INDEX idx_contacts_list ON public.contacts(contact_list_id);
CREATE INDEX idx_email_campaigns_event ON public.email_campaigns(event_id);
CREATE INDEX idx_email_logs_campaign ON public.email_logs(campaign_id);
```

**Step 2: Apply migration**

Run: `cd packages/supabase && npx supabase migration up`
Expected: Migration 033 applied successfully.

**Step 3: Verify tables exist**

Run: `docker exec supabase_db_packages psql -U postgres -d postgres -c "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('contact_lists','contacts','email_campaigns') ORDER BY tablename"`
Expected: All three tables listed.

**Step 4: Commit**

```bash
git add packages/supabase/migrations/033_email_campaigns.sql
git commit -m "feat: add contact_lists, contacts, email_campaigns tables"
```

---

### Task 2: Unsubscribe Token Library

**Files:**
- Create: `apps/web/src/features/emails/lib/unsubscribe.ts`
- Test: `apps/web/src/features/emails/lib/unsubscribe.test.ts`

**Step 1: Write the failing test**

```typescript
import { describe, it, expect } from "vitest";
import { generateUnsubscribeToken, verifyUnsubscribeToken } from "./unsubscribe";

describe("Unsubscribe Tokens", () => {
  it("generates a token and verifies it back to original payload", async () => {
    const payload = { email: "test@example.com", contactListId: "list-1" };
    const token = await generateUnsubscribeToken(payload);

    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(10);

    const verified = await verifyUnsubscribeToken(token);
    expect(verified.email).toBe("test@example.com");
    expect(verified.contactListId).toBe("list-1");
  });

  it("generates a token with registrationId", async () => {
    const payload = { email: "bob@test.com", registrationId: "reg-1" };
    const token = await generateUnsubscribeToken(payload);
    const verified = await verifyUnsubscribeToken(token);

    expect(verified.email).toBe("bob@test.com");
    expect(verified.registrationId).toBe("reg-1");
  });

  it("rejects an invalid token", async () => {
    await expect(verifyUnsubscribeToken("garbage-token")).rejects.toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter web test -- --run src/features/emails/lib/unsubscribe.test.ts`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```typescript
import { SignJWT, jwtVerify } from "jose";

type UnsubscribePayload = {
  email: string;
  contactListId?: string;
  registrationId?: string;
};

const SECRET = new TextEncoder().encode(
  process.env.UNSUBSCRIBE_SECRET || "attendly-unsub-dev-secret-min-32-chars!"
);

export async function generateUnsubscribeToken(
  payload: UnsubscribePayload
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("365d")
    .sign(SECRET);
}

export async function verifyUnsubscribeToken(
  token: string
): Promise<UnsubscribePayload> {
  const { payload } = await jwtVerify(token, SECRET);
  return {
    email: payload.email as string,
    contactListId: payload.contactListId as string | undefined,
    registrationId: payload.registrationId as string | undefined,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm --filter web test -- --run src/features/emails/lib/unsubscribe.test.ts`
Expected: 3 tests PASS

**Step 5: Commit**

```bash
git add apps/web/src/features/emails/lib/unsubscribe.ts apps/web/src/features/emails/lib/unsubscribe.test.ts
git commit -m "feat: add unsubscribe token generation and verification"
```

**Note:** If `jose` is not installed, run `pnpm --filter web add jose` first.

---

### Task 3: Contact List Server Actions + Tests

**Files:**
- Modify: `apps/web/src/features/emails/actions.ts`
- Modify: `apps/web/src/features/emails/queries.ts`
- Test: `apps/web/src/features/emails/actions.test.ts` (add new describe blocks)

**Step 1: Write the failing tests**

Add to `actions.test.ts`:

```typescript
describe("Contact List Actions", () => {
  describe("createContactList", () => {
    it("creates a contact list and returns it", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: { id: "cl-1", name: "Newsletter" }, error: null })
      );

      const { createContactList } = await import("./actions");
      const result = await createContactList({
        organizationId: "org-1",
        name: "Newsletter",
      });

      expect(result).toHaveProperty("id", "cl-1");
      expect(mockFrom).toHaveBeenCalledWith("contact_lists");
    });
  });

  describe("deleteContactList", () => {
    it("deletes a contact list", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { deleteContactList } = await import("./actions");
      await deleteContactList("cl-1");

      expect(mockFrom).toHaveBeenCalledWith("contact_lists");
    });
  });

  describe("uploadContacts", () => {
    it("inserts contacts and returns count", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({ data: [{ id: "c-1" }, { id: "c-2" }], error: null })
      );

      const { uploadContacts } = await import("./actions");
      const result = await uploadContacts("cl-1", [
        { email: "a@test.com", firstName: "Alice", lastName: "A" },
        { email: "b@test.com", firstName: "Bob", lastName: "B" },
      ]);

      expect(result.count).toBe(2);
      expect(mockFrom).toHaveBeenCalledWith("contacts");
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter web test -- --run src/features/emails/actions.test.ts`
Expected: FAIL — createContactList, deleteContactList, uploadContacts not exported

**Step 3: Add implementations to actions.ts**

Append to `apps/web/src/features/emails/actions.ts`:

```typescript
export async function createContactList(data: {
  organizationId: string;
  name: string;
}) {
  const supabase = await createClient();

  const { data: list, error } = await supabase
    .from("contact_lists")
    .insert({
      organization_id: data.organizationId,
      name: data.name,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return list;
}

export async function deleteContactList(listId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("contact_lists")
    .delete()
    .eq("id", listId);

  if (error) throw new Error(error.message);
}

export async function uploadContacts(
  contactListId: string,
  contacts: { email: string; firstName?: string; lastName?: string }[]
) {
  const supabase = await createClient();

  const rows = contacts.map((c) => ({
    contact_list_id: contactListId,
    email: c.email.toLowerCase().trim(),
    first_name: c.firstName ?? null,
    last_name: c.lastName ?? null,
  }));

  const { data, error } = await supabase
    .from("contacts")
    .upsert(rows, { onConflict: "contact_list_id,email", ignoreDuplicates: true })
    .select();

  if (error) throw new Error(error.message);
  return { count: data?.length ?? 0 };
}
```

**Step 4: Add queries to queries.ts**

Append to `apps/web/src/features/emails/queries.ts`:

```typescript
export async function getContactLists(organizationId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("contact_lists")
    .select("*, contacts(count)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getContactsByList(contactListId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("contact_list_id", contactListId)
    .eq("unsubscribed", false)
    .order("email");

  if (error) throw new Error(error.message);
  return data;
}
```

**Step 5: Run tests to verify they pass**

Run: `pnpm --filter web test -- --run src/features/emails/actions.test.ts`
Expected: All tests PASS (existing + new)

**Step 6: Commit**

```bash
git add apps/web/src/features/emails/actions.ts apps/web/src/features/emails/queries.ts apps/web/src/features/emails/actions.test.ts
git commit -m "feat: add contact list CRUD actions and queries"
```

---

### Task 4: Campaign CRUD Actions + Tests

**Files:**
- Modify: `apps/web/src/features/emails/actions.ts`
- Modify: `apps/web/src/features/emails/queries.ts`
- Test: `apps/web/src/features/emails/actions.test.ts` (add new describe blocks)

**Step 1: Write the failing tests**

Add to `actions.test.ts`:

```typescript
describe("Campaign Actions", () => {
  describe("createCampaign", () => {
    it("creates a draft campaign", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({
          data: { id: "camp-1", status: "draft", subject: "Hello" },
          error: null,
        })
      );

      const { createCampaign } = await import("./actions");
      const result = await createCampaign({
        eventId: "evt-1",
        subject: "Hello",
        bodyHtml: "<p>Hi</p>",
        recipientSource: "registrants",
      });

      expect(result).toHaveProperty("id", "camp-1");
      expect(result).toHaveProperty("status", "draft");
      expect(mockFrom).toHaveBeenCalledWith("email_campaigns");
    });
  });

  describe("updateCampaign", () => {
    it("updates campaign fields", async () => {
      mockFrom.mockReturnValue(createQueryMock({ data: null, error: null }));

      const { updateCampaign } = await import("./actions");
      await updateCampaign("camp-1", { subject: "Updated" });

      expect(mockFrom).toHaveBeenCalledWith("email_campaigns");
    });
  });

  describe("sendTestEmail", () => {
    it("sends a test email to the given address", async () => {
      mockFrom.mockReturnValue(
        createQueryMock({
          data: {
            id: "evt-1",
            title: "My Event",
            organization_id: "org-1",
            start_date: "2026-09-15",
            slug: "my-event",
            location: "Venue",
            organizations: [{ slug: "my-org" }],
          },
          error: null,
        })
      );

      const { sendTestEmail } = await import("./actions");
      const { sendEmail } = await import("./lib/send-email");

      await sendTestEmail({
        eventId: "evt-1",
        subject: "Test",
        bodyHtml: "<p>Test</p>",
        recipientEmail: "me@test.com",
      });

      expect(sendEmail).toHaveBeenCalled();
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter web test -- --run src/features/emails/actions.test.ts`
Expected: FAIL — createCampaign, updateCampaign, sendTestEmail not exported

**Step 3: Add implementations to actions.ts**

Append to `apps/web/src/features/emails/actions.ts`:

```typescript
export async function createCampaign(data: {
  eventId: string;
  subject: string;
  bodyHtml: string;
  recipientSource: "contact_list" | "registrants";
  contactListId?: string;
  segmentFilters?: Record<string, unknown>;
  senderName?: string;
  replyTo?: string;
  includeCta?: boolean;
}) {
  const supabase = await createClient();

  const { data: campaign, error } = await supabase
    .from("email_campaigns")
    .insert({
      event_id: data.eventId,
      subject: data.subject,
      body_html: data.bodyHtml,
      recipient_source: data.recipientSource,
      contact_list_id: data.contactListId ?? null,
      segment_filters: data.segmentFilters ?? null,
      sender_name: data.senderName ?? null,
      reply_to: data.replyTo ?? null,
      include_cta: data.includeCta ?? true,
      status: "draft",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return campaign;
}

export async function updateCampaign(
  campaignId: string,
  data: {
    subject?: string;
    bodyHtml?: string;
    recipientSource?: string;
    contactListId?: string | null;
    segmentFilters?: Record<string, unknown> | null;
    senderName?: string;
    replyTo?: string;
    includeCta?: boolean;
  }
) {
  const supabase = await createClient();

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.subject !== undefined) update.subject = data.subject;
  if (data.bodyHtml !== undefined) update.body_html = data.bodyHtml;
  if (data.recipientSource !== undefined) update.recipient_source = data.recipientSource;
  if (data.contactListId !== undefined) update.contact_list_id = data.contactListId;
  if (data.segmentFilters !== undefined) update.segment_filters = data.segmentFilters;
  if (data.senderName !== undefined) update.sender_name = data.senderName;
  if (data.replyTo !== undefined) update.reply_to = data.replyTo;
  if (data.includeCta !== undefined) update.include_cta = data.includeCta;

  const { error } = await supabase
    .from("email_campaigns")
    .update(update)
    .eq("id", campaignId);

  if (error) throw new Error(error.message);
}

export async function sendTestEmail(data: {
  eventId: string;
  subject: string;
  bodyHtml: string;
  recipientEmail: string;
}) {
  const supabase = await createClient();

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title, organization_id, start_date, slug, location, organizations(slug)")
    .eq("id", data.eventId)
    .single();

  if (eventError || !event) throw new Error("Event not found");

  const variables: Record<string, string> = {
    first_name: "Test User",
    event_name: event.title,
    event_date: new Date(event.start_date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    event_url: `/${(event.organizations as any)?.[0]?.slug ?? ""}/${event.slug}`,
  };

  const subject = substituteVariables(data.subject, variables);
  const html = substituteVariables(data.bodyHtml, variables);

  await sendEmail({
    organizationId: event.organization_id,
    eventId: data.eventId,
    to: { email: data.recipientEmail, name: "Test" },
    subject: `[TEST] ${subject}`,
    html,
  });
}
```

**Step 4: Add queries to queries.ts**

Append to `apps/web/src/features/emails/queries.ts`:

```typescript
export async function getCampaigns(eventId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("email_campaigns")
    .select("*, contact_lists(name)")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getCampaignById(campaignId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("email_campaigns")
    .select("*, contact_lists(name)")
    .eq("id", campaignId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}
```

**Step 5: Run tests to verify they pass**

Run: `pnpm --filter web test -- --run src/features/emails/actions.test.ts`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add apps/web/src/features/emails/actions.ts apps/web/src/features/emails/queries.ts apps/web/src/features/emails/actions.test.ts
git commit -m "feat: add campaign CRUD actions and queries"
```

---

### Task 5: Campaign Send Action + Tests

**Files:**
- Modify: `apps/web/src/features/emails/actions.ts`
- Test: `apps/web/src/features/emails/actions.test.ts`

**Step 1: Write the failing test**

Add to `actions.test.ts`:

```typescript
describe("sendCampaign", () => {
  it("sends campaign to contact list recipients", async () => {
    let callIdx = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "email_campaigns" && callIdx === 0) {
        callIdx++;
        return createQueryMock({
          data: {
            id: "camp-1",
            event_id: "evt-1",
            subject: "Hello {{first_name}}",
            body_html: "<p>Hi</p>",
            recipient_source: "contact_list",
            contact_list_id: "cl-1",
            status: "draft",
            include_cta: true,
          },
          error: null,
        });
      }
      if (table === "events") {
        return createQueryMock({
          data: {
            id: "evt-1",
            title: "Test Event",
            organization_id: "org-1",
            start_date: "2026-09-15",
            slug: "test",
            location: "Venue",
            organizations: [{ slug: "test-org" }],
          },
          error: null,
        });
      }
      if (table === "contacts") {
        return createQueryMock({
          data: [
            { email: "a@test.com", first_name: "Alice", unsubscribed: false },
            { email: "b@test.com", first_name: "Bob", unsubscribed: false },
          ],
          error: null,
        });
      }
      return createQueryMock({ data: null, error: null });
    });

    const { sendCampaign } = await import("./actions");
    const result = await sendCampaign("camp-1");

    expect(result).toHaveProperty("sentCount");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter web test -- --run src/features/emails/actions.test.ts`
Expected: FAIL — sendCampaign not exported

**Step 3: Write implementation**

Append to `apps/web/src/features/emails/actions.ts`:

```typescript
export async function sendCampaign(campaignId: string) {
  const supabase = await createClient();

  // Fetch campaign
  const { data: campaign, error: campError } = await supabase
    .from("email_campaigns")
    .select("*")
    .eq("id", campaignId)
    .single();

  if (campError || !campaign) throw new Error("Campaign not found");
  if (campaign.status === "sent") throw new Error("Campaign already sent");

  // Fetch event
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title, organization_id, start_date, slug, location, organizations(slug)")
    .eq("id", campaign.event_id)
    .single();

  if (eventError || !event) throw new Error("Event not found");

  // Mark as sending
  await supabase
    .from("email_campaigns")
    .update({ status: "sending", updated_at: new Date().toISOString() })
    .eq("id", campaignId);

  // Get recipients
  let recipients: { email: string; first_name?: string | null; name?: string | null }[];

  if (campaign.recipient_source === "contact_list" && campaign.contact_list_id) {
    const { data: contacts } = await supabase
      .from("contacts")
      .select("email, first_name")
      .eq("contact_list_id", campaign.contact_list_id)
      .eq("unsubscribed", false);
    recipients = contacts ?? [];
  } else {
    const segmented = await getSegmentedRecipients(campaign.event_id, campaign.segment_filters ?? undefined);
    recipients = segmented;
  }

  if (recipients.length === 0) {
    await supabase
      .from("email_campaigns")
      .update({ status: "sent", sent_count: 0, failed_count: 0, sent_at: new Date().toISOString() })
      .eq("id", campaignId);
    return { sentCount: 0, failedCount: 0 };
  }

  const orgs = event.organizations as unknown as { slug: string }[] | null;
  const orgSlug = orgs?.[0]?.slug ?? "";

  let sentCount = 0;
  let failedCount = 0;

  for (let i = 0; i < recipients.length; i += 50) {
    const batch = recipients.slice(i, i + 50);

    const results = await Promise.allSettled(
      batch.map((recipient) => {
        const firstName = (recipient as any).first_name ?? (recipient as any).name ?? "there";
        const variables: Record<string, string> = {
          first_name: firstName,
          attendee_name: firstName,
          event_name: event.title,
          event_date: new Date(event.start_date).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          event_url: `/${orgSlug}/${event.slug}`,
        };

        const subject = substituteVariables(campaign.subject, variables);
        const html = substituteVariables(campaign.body_html, variables);

        return sendEmail({
          organizationId: event.organization_id,
          eventId: campaign.event_id,
          to: { email: recipient.email, name: firstName },
          subject,
          html,
          campaignId,
        });
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") sentCount++;
      else failedCount++;
    }
  }

  // Mark as sent
  await supabase
    .from("email_campaigns")
    .update({
      status: "sent",
      sent_count: sentCount,
      failed_count: failedCount,
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  revalidatePath(`/events/${campaign.event_id}/emails`);

  return { sentCount, failedCount };
}
```

**Step 4: Update sendEmail to accept campaignId**

In `apps/web/src/features/emails/lib/send-email.ts`, add `campaignId?: string` to `SendEmailParams` and include it in the email_logs insert:

```typescript
type SendEmailParams = {
  organizationId: string;
  eventId: string;
  templateId?: string;
  campaignId?: string;
  to: { email: string; name?: string };
  subject: string;
  html: string;
};
```

And in the insert:

```typescript
campaign_id: params.campaignId ?? null,
```

**Step 5: Run tests to verify they pass**

Run: `pnpm --filter web test -- --run src/features/emails/actions.test.ts`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add apps/web/src/features/emails/actions.ts apps/web/src/features/emails/lib/send-email.ts apps/web/src/features/emails/actions.test.ts
git commit -m "feat: add campaign send action with batch sending and tracking"
```

---

### Task 6: Unsubscribe API Route

**Files:**
- Create: `apps/web/src/app/api/unsubscribe/[token]/route.ts`

**Step 1: Write the API route**

```typescript
import { createClient } from "@supabase/supabase-js";
import { verifyUnsubscribeToken } from "@/features/emails/lib/unsubscribe";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const payload = await verifyUnsubscribeToken(token);
    const supabase = getServiceClient();

    if (payload.contactListId) {
      await supabase
        .from("contacts")
        .update({ unsubscribed: true })
        .eq("contact_list_id", payload.contactListId)
        .eq("email", payload.email);
    } else if (payload.registrationId) {
      await supabase
        .from("registrations")
        .update({ unsubscribed: true })
        .eq("id", payload.registrationId);
    }

    return new Response(
      `<!DOCTYPE html>
      <html><head><title>Unsubscribed</title>
      <style>body{font-family:system-ui;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f8f9fa}
      .card{background:white;padding:2rem 3rem;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);text-align:center}
      h1{color:#16a34a;margin-bottom:0.5rem}p{color:#6b7280}</style></head>
      <body><div class="card"><h1>Unsubscribed</h1><p>You've been successfully unsubscribed from future emails.</p></div></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  } catch {
    return new Response(
      `<!DOCTYPE html>
      <html><head><title>Error</title>
      <style>body{font-family:system-ui;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f8f9fa}
      .card{background:white;padding:2rem 3rem;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1);text-align:center}
      h1{color:#dc2626;margin-bottom:0.5rem}p{color:#6b7280}</style></head>
      <body><div class="card"><h1>Invalid Link</h1><p>This unsubscribe link is invalid or has expired.</p></div></body></html>`,
      { status: 400, headers: { "Content-Type": "text/html" } }
    );
  }
}
```

**Step 2: Commit**

```bash
git add apps/web/src/app/api/unsubscribe/[token]/route.ts
git commit -m "feat: add unsubscribe API route with token verification"
```

---

### Task 7: Campaign Email React Template

**Files:**
- Create: `apps/web/src/features/emails/lib/templates/campaign-email.tsx`

**Step 1: Write the React Email template**

```tsx
import { Html, Head, Body, Container, Heading, Text, Button, Hr, Section } from "@react-email/components";

type CampaignEmailProps = {
  eventName: string;
  eventDate: string;
  eventLocation?: string;
  bodyHtml: string;
  ctaUrl?: string;
  ctaLabel?: string;
  unsubscribeUrl?: string;
};

export function CampaignEmail({
  eventName,
  eventDate,
  eventLocation,
  bodyHtml,
  ctaUrl,
  ctaLabel = "Register",
  unsubscribeUrl,
}: CampaignEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: "#f4f4f5", fontFamily: "system-ui, sans-serif", margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
          <Section style={{ backgroundColor: "#ffffff", borderRadius: "8px", padding: "32px", marginBottom: "16px" }}>
            <Heading style={{ fontSize: "24px", fontWeight: "bold", color: "#111827", margin: "0 0 4px" }}>
              {eventName}
            </Heading>
            <Text style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 8px" }}>
              {eventDate}{eventLocation ? ` · ${eventLocation}` : ""}
            </Text>
            <Hr style={{ borderColor: "#e5e7eb", margin: "16px 0" }} />
            <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
            {ctaUrl && (
              <Section style={{ textAlign: "center", marginTop: "24px" }}>
                <Button
                  href={ctaUrl}
                  style={{
                    backgroundColor: "#0f766e",
                    color: "#ffffff",
                    padding: "12px 24px",
                    borderRadius: "8px",
                    fontSize: "16px",
                    fontWeight: "600",
                    textDecoration: "none",
                  }}
                >
                  {ctaLabel}
                </Button>
              </Section>
            )}
          </Section>
          {unsubscribeUrl && (
            <Text style={{ fontSize: "12px", color: "#9ca3af", textAlign: "center" }}>
              <a href={unsubscribeUrl} style={{ color: "#9ca3af" }}>Unsubscribe</a> from future emails
            </Text>
          )}
        </Container>
      </Body>
    </Html>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/emails/lib/templates/campaign-email.tsx
git commit -m "feat: add campaign email React Email template"
```

---

### Task 8: Contact Lists UI Component

**Files:**
- Create: `apps/web/src/features/emails/components/contact-lists.tsx`

**Step 1: Write the component**

```tsx
"use client";

import { useState, useRef, useTransition } from "react";
import { Upload, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Card } from "@attendly/ui/components";
import { createContactList, uploadContacts, deleteContactList } from "../actions";

type ContactList = {
  id: string;
  name: string;
  contacts: { count: number }[] | [{ count: number }];
  created_at: string;
};

export function ContactLists({
  organizationId,
  initialLists,
}: {
  organizationId: string;
  initialLists: ContactList[];
}) {
  const [lists, setLists] = useState(initialLists);
  const [newName, setNewName] = useState("");
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadListId, setUploadListId] = useState<string | null>(null);

  function getCount(list: ContactList): number {
    if (Array.isArray(list.contacts) && list.contacts.length > 0) {
      return list.contacts[0].count;
    }
    return 0;
  }

  function handleCreate() {
    if (!newName.trim()) return;
    startTransition(async () => {
      try {
        const list = await createContactList({ organizationId, name: newName.trim() });
        setLists((prev) => [{ ...list, contacts: [{ count: 0 }] }, ...prev]);
        setNewName("");
        toast.success("List created");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create list");
      }
    });
  }

  function handleDelete(listId: string) {
    if (!confirm("Delete this contact list and all its contacts?")) return;
    startTransition(async () => {
      try {
        await deleteContactList(listId);
        setLists((prev) => prev.filter((l) => l.id !== listId));
        toast.success("List deleted");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  }

  function handleCSVUpload(listId: string) {
    setUploadListId(listId);
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !uploadListId) return;

    const text = await file.text();
    const lines = text.split("\n").filter((l) => l.trim());
    if (lines.length < 2) {
      toast.error("CSV must have a header row and at least one data row");
      return;
    }

    const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
    const emailIdx = header.findIndex((h) => h === "email");
    const firstIdx = header.findIndex((h) => h.includes("first"));
    const lastIdx = header.findIndex((h) => h.includes("last"));

    if (emailIdx < 0) {
      toast.error('CSV must have an "email" column');
      return;
    }

    const contacts = lines.slice(1).map((line) => {
      const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      return {
        email: cols[emailIdx] ?? "",
        firstName: firstIdx >= 0 ? cols[firstIdx] : undefined,
        lastName: lastIdx >= 0 ? cols[lastIdx] : undefined,
      };
    }).filter((c) => c.email.includes("@"));

    startTransition(async () => {
      try {
        const result = await uploadContacts(uploadListId, contacts);
        toast.success(`Uploaded ${result.count} contacts`);
        window.location.reload();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      }
    });

    e.target.value = "";
    setUploadListId(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div className="flex-1 space-y-1">
          <label className="text-sm font-medium">New Contact List</label>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Newsletter Subscribers"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
        </div>
        <Button onClick={handleCreate} disabled={isPending || !newName.trim()}>
          <Plus className="h-4 w-4" /> Create
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileChange}
      />

      {lists.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No contact lists yet. Create one above.
        </p>
      ) : (
        <div className="space-y-2">
          {lists.map((list) => (
            <Card key={list.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">{list.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {getCount(list)} contacts
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCSVUpload(list.id)}
                  disabled={isPending}
                >
                  <Upload className="h-3.5 w-3.5" /> CSV
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(list.id)}
                  disabled={isPending}
                  className="hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/emails/components/contact-lists.tsx
git commit -m "feat: add contact lists UI with CSV upload"
```

---

### Task 9: Campaign List + Campaign Composer UI

**Files:**
- Create: `apps/web/src/features/emails/components/campaign-list.tsx`
- Create: `apps/web/src/features/emails/components/campaign-composer.tsx`
- Create: `apps/web/src/features/emails/components/campaign-preview.tsx`

**Step 1: Write campaign-list.tsx**

Table of campaigns with subject, audience, status, sent count, date, and link to edit/view.

```tsx
"use client";

import Link from "next/link";
import { Badge } from "@attendly/ui/components";

type Campaign = {
  id: string;
  subject: string;
  recipient_source: string;
  contact_lists: { name: string } | null;
  status: string;
  sent_count: number;
  sent_at: string | null;
  created_at: string;
};

const statusVariant: Record<string, "success" | "warning" | "default"> = {
  sent: "success",
  sending: "warning",
  draft: "default",
};

export function CampaignList({ campaigns, eventId }: { campaigns: Campaign[]; eventId: string }) {
  if (campaigns.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        No campaigns yet. Create one to get started.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="px-4 py-2.5 text-left font-medium">Subject</th>
            <th className="px-4 py-2.5 text-left font-medium">Audience</th>
            <th className="px-4 py-2.5 text-left font-medium">Status</th>
            <th className="px-4 py-2.5 text-left font-medium">Sent</th>
            <th className="px-4 py-2.5 text-left font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c) => (
            <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
              <td className="px-4 py-2.5">
                <Link
                  href={`/events/${eventId}/emails/campaigns/${c.id}`}
                  className="font-medium hover:underline"
                >
                  {c.subject || "(No subject)"}
                </Link>
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {c.recipient_source === "contact_list"
                  ? c.contact_lists?.name ?? "Contact List"
                  : "Registered Attendees"}
              </td>
              <td className="px-4 py-2.5">
                <Badge variant={statusVariant[c.status] ?? "default"}>
                  {c.status}
                </Badge>
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">{c.sent_count}</td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {c.sent_at
                  ? new Date(c.sent_at).toLocaleDateString()
                  : new Date(c.created_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Step 2: Write campaign-preview.tsx**

```tsx
"use client";

export function CampaignPreview({
  eventName,
  eventDate,
  eventLocation,
  subject,
  bodyHtml,
  showCta,
  ctaUrl,
}: {
  eventName: string;
  eventDate: string;
  eventLocation?: string;
  subject: string;
  bodyHtml: string;
  showCta: boolean;
  ctaUrl?: string;
}) {
  const previewBody = bodyHtml
    .replace(/\{\{first_name\}\}/g, "Jane")
    .replace(/\{\{event_name\}\}/g, eventName)
    .replace(/\{\{event_date\}\}/g, eventDate)
    .replace(/\{\{event_url\}\}/g, ctaUrl ?? "#");

  const previewSubject = subject
    .replace(/\{\{first_name\}\}/g, "Jane")
    .replace(/\{\{event_name\}\}/g, eventName);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Email Preview</h3>
      <div className="rounded-lg border bg-[#f4f4f5] p-4">
        <div className="mx-auto max-w-[600px] rounded-lg bg-white p-8 shadow-sm">
          <p className="mb-4 text-xs text-muted-foreground">
            Subject: <span className="font-medium text-foreground">{previewSubject || "(No subject)"}</span>
          </p>
          <h2 className="text-xl font-bold">{eventName}</h2>
          <p className="text-sm text-muted-foreground">
            {eventDate}{eventLocation ? ` · ${eventLocation}` : ""}
          </p>
          <hr className="my-4 border-gray-200" />
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: previewBody || "<p class='text-muted-foreground italic'>Start typing to see preview...</p>" }}
          />
          {showCta && ctaUrl && (
            <div className="mt-6 text-center">
              <span className="inline-block rounded-lg bg-[#0f766e] px-6 py-3 text-sm font-semibold text-white">
                Register
              </span>
            </div>
          )}
          <p className="mt-6 text-center text-xs text-gray-400">
            <span className="underline">Unsubscribe</span> from future emails
          </p>
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Write campaign-composer.tsx**

This is the full-page campaign form. It receives event data, contact lists, ticket types, and past campaigns as props from the server page component.

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, Save, FlaskConical, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Button, Input, Textarea } from "@attendly/ui/components";
import { createCampaign, updateCampaign, sendCampaign, sendTestEmail } from "../actions";
import { CampaignPreview } from "./campaign-preview";

type ContactList = { id: string; name: string; contacts: { count: number }[] | [{ count: number }] };
type TicketType = { id: string; name: string };
type PastCampaign = { id: string; subject: string; body_html: string };

type InitialData = {
  id?: string;
  subject?: string;
  body_html?: string;
  recipient_source?: string;
  contact_list_id?: string | null;
  segment_filters?: Record<string, unknown> | null;
  sender_name?: string;
  reply_to?: string;
  include_cta?: boolean;
  status?: string;
} | null;

export function CampaignComposer({
  eventId,
  eventName,
  eventDate,
  eventLocation,
  eventUrl,
  contactLists,
  ticketTypes,
  pastCampaigns,
  initial,
  userEmail,
}: {
  eventId: string;
  eventName: string;
  eventDate: string;
  eventLocation?: string;
  eventUrl: string;
  contactLists: ContactList[];
  ticketTypes: TicketType[];
  pastCampaigns: PastCampaign[];
  initial: InitialData;
  userEmail?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [subject, setSubject] = useState(initial?.subject ?? "");
  const [bodyHtml, setBodyHtml] = useState(initial?.body_html ?? "");
  const [recipientSource, setRecipientSource] = useState<"contact_list" | "registrants">(
    (initial?.recipient_source as any) ?? "registrants"
  );
  const [contactListId, setContactListId] = useState(initial?.contact_list_id ?? "");
  const [senderName, setSenderName] = useState(initial?.sender_name ?? "");
  const [replyTo, setReplyTo] = useState(initial?.reply_to ?? "");
  const [includeCta, setIncludeCta] = useState(initial?.include_cta ?? true);
  const [selectedTicketTypes, setSelectedTicketTypes] = useState<string[]>(
    (initial?.segment_filters as any)?.ticket_type_ids ?? []
  );
  const [campaignId, setCampaignId] = useState(initial?.id);
  const isSent = initial?.status === "sent";

  const statuses = [
    { value: "confirmed", label: "Confirmed" },
    { value: "checked_in", label: "Checked In" },
    { value: "pending", label: "Pending" },
  ];
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(
    (initial?.segment_filters as any)?.statuses ?? []
  );

  function getFilters() {
    return {
      ticket_type_ids: selectedTicketTypes.length > 0 ? selectedTicketTypes : undefined,
      statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
    };
  }

  function handleSaveDraft() {
    startTransition(async () => {
      try {
        if (campaignId) {
          await updateCampaign(campaignId, {
            subject,
            bodyHtml,
            recipientSource,
            contactListId: recipientSource === "contact_list" ? contactListId : null,
            segmentFilters: recipientSource === "registrants" ? getFilters() : null,
            senderName: senderName || undefined,
            replyTo: replyTo || undefined,
            includeCta,
          });
          toast.success("Draft saved");
        } else {
          const camp = await createCampaign({
            eventId,
            subject,
            bodyHtml,
            recipientSource,
            contactListId: recipientSource === "contact_list" ? contactListId : undefined,
            segmentFilters: recipientSource === "registrants" ? getFilters() : undefined,
            senderName: senderName || undefined,
            replyTo: replyTo || undefined,
            includeCta,
          });
          setCampaignId(camp.id);
          toast.success("Draft created");
          router.replace(`/events/${eventId}/emails/campaigns/${camp.id}`);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save");
      }
    });
  }

  function handleSend() {
    if (!subject.trim() || !bodyHtml.trim()) {
      toast.error("Subject and body are required");
      return;
    }
    if (!confirm("Send this campaign? This cannot be undone.")) return;

    startTransition(async () => {
      try {
        // Save first
        if (!campaignId) {
          const camp = await createCampaign({
            eventId, subject, bodyHtml, recipientSource,
            contactListId: recipientSource === "contact_list" ? contactListId : undefined,
            segmentFilters: recipientSource === "registrants" ? getFilters() : undefined,
            senderName: senderName || undefined,
            replyTo: replyTo || undefined,
            includeCta,
          });
          setCampaignId(camp.id);
          const result = await sendCampaign(camp.id);
          toast.success(`Sent to ${result.sentCount} recipients (${result.failedCount} failed)`);
        } else {
          await updateCampaign(campaignId, {
            subject, bodyHtml, recipientSource,
            contactListId: recipientSource === "contact_list" ? contactListId : null,
            segmentFilters: recipientSource === "registrants" ? getFilters() : null,
            senderName: senderName || undefined,
            replyTo: replyTo || undefined,
            includeCta,
          });
          const result = await sendCampaign(campaignId);
          toast.success(`Sent to ${result.sentCount} recipients (${result.failedCount} failed)`);
        }
        router.push(`/events/${eventId}/emails`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to send");
      }
    });
  }

  function handleSendTest() {
    const email = userEmail ?? prompt("Send test email to:");
    if (!email) return;
    startTransition(async () => {
      try {
        await sendTestEmail({ eventId, subject, bodyHtml, recipientEmail: email });
        toast.success(`Test email sent to ${email}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to send test");
      }
    });
  }

  function handleReusePast(campaign: PastCampaign) {
    setSubject(campaign.subject);
    setBodyHtml(campaign.body_html);
    toast.success("Content loaded from past campaign");
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/events/${eventId}/emails`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Emails
      </Link>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left: Form */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">
            {isSent ? "View Campaign" : campaignId ? "Edit Campaign" : "Create Campaign"}
          </h2>

          {/* Recipients */}
          <fieldset disabled={isSent} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Recipients</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={recipientSource === "registrants"}
                    onChange={() => setRecipientSource("registrants")}
                  /> Registered Attendees
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={recipientSource === "contact_list"}
                    onChange={() => setRecipientSource("contact_list")}
                  /> Contact List
                </label>
              </div>
            </div>

            {recipientSource === "contact_list" && (
              <select
                value={contactListId}
                onChange={(e) => setContactListId(e.target.value)}
                className="w-full rounded-lg border px-3 py-2 text-sm"
              >
                <option value="">Select a contact list...</option>
                {contactLists.map((cl) => (
                  <option key={cl.id} value={cl.id}>
                    {cl.name} ({Array.isArray(cl.contacts) && cl.contacts[0] ? cl.contacts[0].count : 0} contacts)
                  </option>
                ))}
              </select>
            )}

            {recipientSource === "registrants" && (
              <div className="space-y-3 rounded-lg border p-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Ticket Types</label>
                  <div className="flex flex-wrap gap-2">
                    {ticketTypes.map((tt) => (
                      <label key={tt.id} className="flex items-center gap-1.5 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedTicketTypes.includes(tt.id)}
                          onChange={(e) =>
                            setSelectedTicketTypes((prev) =>
                              e.target.checked ? [...prev, tt.id] : prev.filter((id) => id !== tt.id)
                            )
                          }
                        />
                        {tt.name}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <div className="flex flex-wrap gap-2">
                    {statuses.map((s) => (
                      <label key={s.value} className="flex items-center gap-1.5 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedStatuses.includes(s.value)}
                          onChange={(e) =>
                            setSelectedStatuses((prev) =>
                              e.target.checked ? [...prev, s.value] : prev.filter((v) => v !== s.value)
                            )
                          }
                        />
                        {s.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Sender Info */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Sender Name</label>
                <Input value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="e.g. Event Team" />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Reply-to Email</label>
                <Input value={replyTo} onChange={(e) => setReplyTo(e.target.value)} placeholder="replies@example.com" />
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Subject</label>
                {pastCampaigns.length > 0 && (
                  <select
                    className="rounded border px-2 py-1 text-xs"
                    onChange={(e) => {
                      const camp = pastCampaigns.find((c) => c.id === e.target.value);
                      if (camp) handleReusePast(camp);
                      e.target.value = "";
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>Reuse past email...</option>
                    {pastCampaigns.map((c) => (
                      <option key={c.id} value={c.id}>{c.subject}</option>
                    ))}
                  </select>
                )}
              </div>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. You're invited to {{event_name}}"
              />
              <p className="text-xs text-muted-foreground">
                Variables: {"{{first_name}}"}, {"{{event_name}}"}, {"{{event_date}}"}
              </p>
            </div>

            {/* Body */}
            <div className="space-y-1">
              <label className="text-sm font-medium">Body</label>
              <Textarea
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                rows={10}
                placeholder="Write your email content..."
              />
            </div>

            {/* CTA Toggle */}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeCta}
                onChange={(e) => setIncludeCta(e.target.checked)}
              />
              Include "Register" button linking to event page
            </label>
          </fieldset>

          {/* Actions */}
          {!isSent && (
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={handleSendTest} disabled={isPending || !subject.trim()}>
                <FlaskConical className="h-4 w-4" /> Send Test
              </Button>
              <Button variant="outline" onClick={handleSaveDraft} disabled={isPending}>
                <Save className="h-4 w-4" /> Save Draft
              </Button>
              <Button onClick={handleSend} disabled={isPending || !subject.trim() || !bodyHtml.trim()}>
                <Send className="h-4 w-4" /> {isPending ? "Sending..." : "Send Campaign"}
              </Button>
            </div>
          )}
        </div>

        {/* Right: Preview */}
        <div>
          <CampaignPreview
            eventName={eventName}
            eventDate={eventDate}
            eventLocation={eventLocation}
            subject={subject}
            bodyHtml={bodyHtml.replace(/\n/g, "<br/>")}
            showCta={includeCta}
            ctaUrl={eventUrl}
          />
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/emails/components/campaign-list.tsx apps/web/src/features/emails/components/campaign-composer.tsx apps/web/src/features/emails/components/campaign-preview.tsx
git commit -m "feat: add campaign list, composer, and preview UI components"
```

---

### Task 10: Create Automation UI Component

**Files:**
- Create: `apps/web/src/features/emails/components/create-automation.tsx`

**Step 1: Write the component**

```tsx
"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button, Input } from "@attendly/ui/components";
import { createEmailAutomation } from "../actions";

type Template = { id: string; name: string };

const triggerOptions = [
  { value: "on_registration", label: "On Registration" },
  { value: "pre_event_24h", label: "24 Hours Before Event" },
  { value: "pre_event_1h", label: "1 Hour Before Event" },
  { value: "post_event", label: "After Event Ends" },
];

export function CreateAutomation({
  eventId,
  templates,
  onCreated,
}: {
  eventId: string;
  templates: Template[];
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [trigger, setTrigger] = useState(triggerOptions[0].value);
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Add Automation
      </Button>
    );
  }

  function handleCreate() {
    if (!templateId) {
      toast.error("Select a template");
      return;
    }
    startTransition(async () => {
      try {
        await createEmailAutomation({ eventId, trigger, templateId });
        toast.success("Automation created");
        setOpen(false);
        onCreated();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create");
      }
    });
  }

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <h4 className="text-sm font-medium">New Automation</h4>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Trigger</label>
          <select
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          >
            {triggerOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Template</label>
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
          >
            {templates.length === 0 && <option value="">No templates available</option>}
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleCreate} disabled={isPending || !templateId}>
          Create
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/emails/components/create-automation.tsx
git commit -m "feat: add create automation UI component"
```

---

### Task 11: Restructure Emails Page + Campaign Routes

**Files:**
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/emails/page.tsx`
- Create: `apps/web/src/app/(organizer)/events/[eventId]/emails/campaigns/new/page.tsx`
- Create: `apps/web/src/app/(organizer)/events/[eventId]/emails/campaigns/[id]/page.tsx`

**Step 1: Rewrite the emails page**

```tsx
import { createClient } from "@attendly/ui/supabase/server";
import { getEmailLogsByEvent, getEmailAutomationsByEvent, getEmailStats, getCampaigns, getContactLists } from "@/features/emails/queries";
import { getTicketTypesByEvent } from "@/features/tickets/queries";
import { getEmailTemplatesByOrg } from "@/features/emails/queries";
import { EmailDashboard } from "@/features/emails/components/email-dashboard";
import { EmailLogTable } from "@/features/emails/components/email-log-table";
import { AutomationList } from "@/features/emails/components/automation-list";
import { CampaignList } from "@/features/emails/components/campaign-list";
import { ContactLists } from "@/features/emails/components/contact-lists";
import { EmailsPageClient } from "@/features/emails/components/emails-page-client";
import Link from "next/link";
import { Plus } from "lucide-react";

export default async function EmailsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("organization_id")
    .eq("id", eventId)
    .single();

  const orgId = event?.organization_id;

  const [stats, logs, automations, ticketTypes, campaigns, contactLists, templates] = await Promise.all([
    getEmailStats(eventId),
    getEmailLogsByEvent(eventId),
    getEmailAutomationsByEvent(eventId),
    getTicketTypesByEvent(eventId),
    getCampaigns(eventId),
    orgId ? getContactLists(orgId) : Promise.resolve([]),
    orgId ? getEmailTemplatesByOrg(orgId) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Emails</h2>
        <div className="flex gap-2">
          <EmailsPageClient eventId={eventId} ticketTypes={ticketTypes} />
          <Link
            href={`/events/${eventId}/emails/campaigns/new`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Create Campaign
          </Link>
        </div>
      </div>

      <EmailDashboard stats={stats} />

      {/* Campaigns */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Campaigns</h2>
        <CampaignList campaigns={campaigns} eventId={eventId} />
      </div>

      {/* Contact Lists */}
      {orgId && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Contact Lists</h2>
          <ContactLists organizationId={orgId} initialLists={contactLists} />
        </div>
      )}

      {/* Automations */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Automations</h2>
        <AutomationList initialAutomations={automations} />
      </div>

      {/* Recent Emails */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Recent Emails</h2>
        <EmailLogTable logs={logs} />
      </div>
    </div>
  );
}
```

**Step 2: Create new campaign page**

```tsx
import { createClient } from "@attendly/ui/supabase/server";
import { getContactLists, getCampaigns } from "@/features/emails/queries";
import { getTicketTypesByEvent } from "@/features/tickets/queries";
import { CampaignComposer } from "@/features/emails/components/campaign-composer";
import { notFound } from "next/navigation";

export default async function NewCampaignPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("title, start_date, location, slug, organization_id, organizations(slug)")
    .eq("id", eventId)
    .single();

  if (!event) notFound();

  const { data: { user } } = await supabase.auth.getUser();

  const orgs = event.organizations as unknown as { slug: string }[] | null;
  const orgSlug = orgs?.[0]?.slug ?? "";

  const [contactLists, ticketTypes, pastCampaigns] = await Promise.all([
    getContactLists(event.organization_id),
    getTicketTypesByEvent(eventId),
    getCampaigns(eventId),
  ]);

  return (
    <CampaignComposer
      eventId={eventId}
      eventName={event.title}
      eventDate={new Date(event.start_date).toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      })}
      eventLocation={event.location}
      eventUrl={`/${orgSlug}/${event.slug}/register`}
      contactLists={contactLists}
      ticketTypes={ticketTypes}
      pastCampaigns={pastCampaigns.filter((c) => c.status === "sent")}
      initial={null}
      userEmail={user?.email ?? undefined}
    />
  );
}
```

**Step 3: Create edit/view campaign page**

```tsx
import { createClient } from "@attendly/ui/supabase/server";
import { getCampaignById, getContactLists, getCampaigns } from "@/features/emails/queries";
import { getTicketTypesByEvent } from "@/features/tickets/queries";
import { CampaignComposer } from "@/features/emails/components/campaign-composer";
import { notFound } from "next/navigation";

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ eventId: string; id: string }>;
}) {
  const { eventId, id } = await params;
  const supabase = await createClient();

  const [campaign, event] = await Promise.all([
    getCampaignById(id).catch(() => null),
    supabase
      .from("events")
      .select("title, start_date, location, slug, organization_id, organizations(slug)")
      .eq("id", eventId)
      .single()
      .then((r) => r.data),
  ]);

  if (!campaign || !event) notFound();

  const { data: { user } } = await supabase.auth.getUser();

  const orgs = event.organizations as unknown as { slug: string }[] | null;
  const orgSlug = orgs?.[0]?.slug ?? "";

  const [contactLists, ticketTypes, pastCampaigns] = await Promise.all([
    getContactLists(event.organization_id),
    getTicketTypesByEvent(eventId),
    getCampaigns(eventId),
  ]);

  return (
    <CampaignComposer
      eventId={eventId}
      eventName={event.title}
      eventDate={new Date(event.start_date).toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
      })}
      eventLocation={event.location}
      eventUrl={`/${orgSlug}/${event.slug}/register`}
      contactLists={contactLists}
      ticketTypes={ticketTypes}
      pastCampaigns={pastCampaigns.filter((c) => c.status === "sent" && c.id !== id)}
      initial={campaign}
      userEmail={user?.email ?? undefined}
    />
  );
}
```

**Step 4: Run the app and verify pages compile**

Run: `pnpm --filter web build` (or dev server) — verify no TypeScript errors.

**Step 5: Commit**

```bash
git add apps/web/src/app/\(organizer\)/events/\[eventId\]/emails/
git commit -m "feat: restructure emails page with campaigns, contact lists, and automation sections"
```

---

### Task 12: Integration Testing & Verification

**Step 1: Run all existing tests**

Run: `pnpm --filter web test -- --run`
Expected: All tests pass (existing 119 + new campaign/unsubscribe tests)

**Step 2: Start dev server and verify UI**

1. Navigate to `/events/{eventId}/emails` — should show campaigns table, contact lists, automations, logs
2. Click "Create Campaign" — should show full-page composer with preview
3. Create a contact list, upload CSV
4. Save a draft campaign
5. Send a test email

**Step 3: Final commit (if any fixes needed)**

```bash
git add -A && git commit -m "fix: address integration issues from email campaigns testing"
```

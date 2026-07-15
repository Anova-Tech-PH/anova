# Email & Communications Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add email capabilities to Attendly so organizers can send automated transactional emails and manual broadcast emails with audience segmentation, using Resend as the email provider.

**Architecture:** Direct Resend SDK integration in Next.js server actions. React Email components for templates. Vercel Cron for scheduled reminders. New database tables for email_templates, email_logs, and email_automations.

**Tech Stack:** Resend, @react-email/components, Next.js server actions, Supabase (PostgreSQL), Vercel Cron

---

### Task 1: Install dependencies

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/.env.local.example`

**Step 1: Install Resend and React Email packages**

Run:
```bash
cd /Users/bertwinromero/Documents/billionsoulharves-workspace/attendly && pnpm add resend @react-email/components --filter @attendly/web
```

**Step 2: Add environment variable to .env.local.example**

Add to `apps/web/.env.local.example`:
```
RESEND_API_KEY=re_your_api_key_here
```

**Step 3: Add RESEND_API_KEY to .env.local**

Add a real or test Resend API key to `apps/web/.env.local`:
```
RESEND_API_KEY=re_test_key_here
```

**Step 4: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml apps/web/.env.local.example
git commit -m "feat(email): install resend and react-email dependencies"
```

---

### Task 2: Create database migration for email tables

**Files:**
- Create: `packages/supabase/migrations/012_email_communications.sql`

**Step 1: Write the migration**

```sql
-- =============================================================================
-- Email & Communications: templates, logs, automations, and unsubscribe support
-- =============================================================================

-- Email templates (reusable per organization)
CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'transactional' CHECK (type IN ('transactional', 'marketing')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email send log
CREATE TABLE public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'bounced')),
  resend_id TEXT,
  sent_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Automated email rules per event
CREATE TABLE public.email_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  trigger TEXT NOT NULL CHECK (trigger IN ('on_registration', 'pre_event_24h', 'pre_event_1h', 'post_event')),
  template_id UUID NOT NULL REFERENCES public.email_templates(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, trigger)
);

-- Add unsubscribed flag to registrations
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS unsubscribed BOOLEAN NOT NULL DEFAULT false;

-- Indexes
CREATE INDEX idx_email_logs_event_id ON public.email_logs(event_id);
CREATE INDEX idx_email_logs_status ON public.email_logs(status);
CREATE INDEX idx_email_automations_event_id ON public.email_automations(event_id);
CREATE INDEX idx_email_templates_org_id ON public.email_templates(organization_id);

-- RLS policies
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_automations ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
GRANT SELECT, INSERT ON public.email_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_automations TO authenticated;

-- email_templates: org members can manage
CREATE POLICY "Org members can manage email templates"
  ON public.email_templates FOR ALL TO authenticated
  USING (is_org_member(organization_id, auth.uid()))
  WITH CHECK (is_org_member(organization_id, auth.uid()));

-- email_logs: org members can view and insert
CREATE POLICY "Org members can view email logs"
  ON public.email_logs FOR SELECT TO authenticated
  USING (is_org_member(organization_id, auth.uid()));

CREATE POLICY "Org members can insert email logs"
  ON public.email_logs FOR INSERT TO authenticated
  WITH CHECK (is_org_member(organization_id, auth.uid()));

-- email_automations: via event's org membership
CREATE POLICY "Org members can manage email automations"
  ON public.email_automations FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE e.id = email_automations.event_id AND om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE e.id = email_automations.event_id AND om.user_id = auth.uid()
    )
  );
```

**Step 2: Run the migration**

Run:
```bash
cd /Users/bertwinromero/Documents/billionsoulharves-workspace/attendly && npx supabase migration up --local
```
Expected: Migration applied successfully.

**Step 3: Verify tables exist**

Run:
```bash
cd /Users/bertwinromero/Documents/billionsoulharves-workspace/attendly && npx supabase db query "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'email%'" --local
```
Expected: email_templates, email_logs, email_automations

**Step 4: Commit**

```bash
git add packages/supabase/migrations/012_email_communications.sql
git commit -m "feat(email): add database tables for email templates, logs, and automations"
```

---

### Task 3: Add email constants and Zod schemas

**Files:**
- Modify: `packages/shared/src/constants/index.ts`
- Create: `packages/shared/src/schemas/email.ts`

**Step 1: Add constants**

Append to `packages/shared/src/constants/index.ts`:

```typescript
export const EMAIL_TYPE = {
  TRANSACTIONAL: "transactional",
  MARKETING: "marketing",
} as const;

export type EmailType = (typeof EMAIL_TYPE)[keyof typeof EMAIL_TYPE];

export const EMAIL_STATUS = {
  QUEUED: "queued",
  SENT: "sent",
  DELIVERED: "delivered",
  FAILED: "failed",
  BOUNCED: "bounced",
} as const;

export type EmailStatus = (typeof EMAIL_STATUS)[keyof typeof EMAIL_STATUS];

export const EMAIL_TRIGGER = {
  ON_REGISTRATION: "on_registration",
  PRE_EVENT_24H: "pre_event_24h",
  PRE_EVENT_1H: "pre_event_1h",
  POST_EVENT: "post_event",
} as const;

export type EmailTrigger = (typeof EMAIL_TRIGGER)[keyof typeof EMAIL_TRIGGER];
```

**Step 2: Create email schemas**

Create `packages/shared/src/schemas/email.ts`:

```typescript
import { z } from "zod";

export const createEmailTemplateSchema = z.object({
  organization_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  subject: z.string().min(1).max(500),
  body_html: z.string().min(1),
  type: z.enum(["transactional", "marketing"]).default("transactional"),
});

export const sendBroadcastSchema = z.object({
  event_id: z.string().uuid(),
  subject: z.string().min(1).max(500),
  body_html: z.string().min(1),
  filters: z.object({
    ticket_type_ids: z.array(z.string().uuid()).optional(),
    statuses: z.array(z.enum(["pending", "confirmed", "cancelled", "checked_in"])).optional(),
    checked_in: z.boolean().optional(),
  }).optional(),
});

export const createAutomationSchema = z.object({
  event_id: z.string().uuid(),
  trigger: z.enum(["on_registration", "pre_event_24h", "pre_event_1h", "post_event"]),
  template_id: z.string().uuid(),
  enabled: z.boolean().default(true),
});

export type CreateEmailTemplateInput = z.infer<typeof createEmailTemplateSchema>;
export type SendBroadcastInput = z.infer<typeof sendBroadcastSchema>;
export type CreateAutomationInput = z.infer<typeof createAutomationSchema>;
```

**Step 3: Commit**

```bash
git add packages/shared/src/constants/index.ts packages/shared/src/schemas/email.ts
git commit -m "feat(email): add email constants and Zod schemas"
```

---

### Task 4: Create Resend client and email utility

**Files:**
- Create: `apps/web/src/features/emails/lib/resend.ts`
- Create: `apps/web/src/features/emails/lib/send-email.ts`

**Step 1: Create Resend client singleton**

Create `apps/web/src/features/emails/lib/resend.ts`:

```typescript
import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);
```

**Step 2: Create send-email utility**

Create `apps/web/src/features/emails/lib/send-email.ts`:

```typescript
import { resend } from "./resend";
import { createClient } from "@/shared/utils/supabase/server";

type SendEmailParams = {
  organizationId: string;
  eventId: string;
  templateId?: string;
  to: { email: string; name?: string };
  subject: string;
  html: string;
};

export async function sendEmail(params: SendEmailParams) {
  const supabase = await createClient();

  const { data, error: sendError } = await resend.emails.send({
    from: "Attendly <noreply@attendly.app>",
    to: params.to.email,
    subject: params.subject,
    html: params.html,
  });

  const status = sendError ? "failed" : "sent";

  await supabase.from("email_logs").insert({
    organization_id: params.organizationId,
    event_id: params.eventId,
    template_id: params.templateId ?? null,
    recipient_email: params.to.email,
    recipient_name: params.to.name ?? null,
    subject: params.subject,
    status,
    resend_id: data?.id ?? null,
    sent_at: sendError ? null : new Date().toISOString(),
    error: sendError?.message ?? null,
  });

  if (sendError) {
    throw new Error(`Failed to send email: ${sendError.message}`);
  }

  return data;
}

export function substituteVariables(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? "");
}
```

**Step 3: Commit**

```bash
git add apps/web/src/features/emails/lib/
git commit -m "feat(email): add Resend client and send-email utility with logging"
```

---

### Task 5: Create React Email templates

**Files:**
- Create: `apps/web/src/features/emails/lib/templates/registration-confirmation.tsx`
- Create: `apps/web/src/features/emails/lib/templates/event-reminder.tsx`
- Create: `apps/web/src/features/emails/lib/templates/post-event.tsx`

**Step 1: Create registration confirmation template**

Create `apps/web/src/features/emails/lib/templates/registration-confirmation.tsx`:

```tsx
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Button,
  Hr,
} from "@react-email/components";

type Props = {
  attendeeName: string;
  eventName: string;
  eventDate: string;
  eventUrl: string;
  ticketType: string;
};

export function RegistrationConfirmation({
  attendeeName = "Attendee",
  eventName = "Event",
  eventDate = "",
  eventUrl = "#",
  ticketType = "General",
}: Props) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "system-ui, sans-serif", backgroundColor: "#f9fafb" }}>
        <Container style={{ maxWidth: "520px", margin: "40px auto", backgroundColor: "#fff", borderRadius: "8px", padding: "32px" }}>
          <Heading style={{ fontSize: "20px", marginBottom: "16px" }}>
            You're registered!
          </Heading>
          <Text style={{ fontSize: "14px", color: "#374151" }}>
            Hi {attendeeName}, your registration for <strong>{eventName}</strong> is confirmed.
          </Text>
          <Section style={{ backgroundColor: "#f3f4f6", borderRadius: "6px", padding: "16px", margin: "16px 0" }}>
            <Text style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 4px" }}>Event</Text>
            <Text style={{ fontSize: "14px", fontWeight: "600", margin: "0 0 8px" }}>{eventName}</Text>
            <Text style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 4px" }}>Date</Text>
            <Text style={{ fontSize: "14px", margin: "0 0 8px" }}>{eventDate}</Text>
            <Text style={{ fontSize: "13px", color: "#6b7280", margin: "0 0 4px" }}>Ticket</Text>
            <Text style={{ fontSize: "14px", margin: "0" }}>{ticketType}</Text>
          </Section>
          <Button
            href={eventUrl}
            style={{ backgroundColor: "#18181b", color: "#fff", padding: "10px 20px", borderRadius: "6px", fontSize: "14px", textDecoration: "none" }}
          >
            View Event
          </Button>
          <Hr style={{ margin: "24px 0", borderColor: "#e5e7eb" }} />
          <Text style={{ fontSize: "12px", color: "#9ca3af" }}>
            Attendly - Event Management Platform
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

**Step 2: Create event reminder template**

Create `apps/web/src/features/emails/lib/templates/event-reminder.tsx`:

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
} from "@react-email/components";

type Props = {
  attendeeName: string;
  eventName: string;
  eventDate: string;
  eventUrl: string;
  timeUntil: string;
};

export function EventReminder({
  attendeeName = "Attendee",
  eventName = "Event",
  eventDate = "",
  eventUrl = "#",
  timeUntil = "soon",
}: Props) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "system-ui, sans-serif", backgroundColor: "#f9fafb" }}>
        <Container style={{ maxWidth: "520px", margin: "40px auto", backgroundColor: "#fff", borderRadius: "8px", padding: "32px" }}>
          <Heading style={{ fontSize: "20px", marginBottom: "16px" }}>
            {eventName} starts {timeUntil}!
          </Heading>
          <Text style={{ fontSize: "14px", color: "#374151" }}>
            Hi {attendeeName}, just a reminder that <strong>{eventName}</strong> is coming up {timeUntil}.
          </Text>
          <Text style={{ fontSize: "14px", color: "#374151" }}>
            <strong>When:</strong> {eventDate}
          </Text>
          <Button
            href={eventUrl}
            style={{ backgroundColor: "#18181b", color: "#fff", padding: "10px 20px", borderRadius: "6px", fontSize: "14px", textDecoration: "none", marginTop: "16px" }}
          >
            View Event Details
          </Button>
          <Hr style={{ margin: "24px 0", borderColor: "#e5e7eb" }} />
          <Text style={{ fontSize: "12px", color: "#9ca3af" }}>
            Attendly - Event Management Platform
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

**Step 3: Create post-event template**

Create `apps/web/src/features/emails/lib/templates/post-event.tsx`:

```tsx
import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Hr,
} from "@react-email/components";

type Props = {
  attendeeName: string;
  eventName: string;
};

export function PostEvent({
  attendeeName = "Attendee",
  eventName = "Event",
}: Props) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "system-ui, sans-serif", backgroundColor: "#f9fafb" }}>
        <Container style={{ maxWidth: "520px", margin: "40px auto", backgroundColor: "#fff", borderRadius: "8px", padding: "32px" }}>
          <Heading style={{ fontSize: "20px", marginBottom: "16px" }}>
            Thanks for attending {eventName}!
          </Heading>
          <Text style={{ fontSize: "14px", color: "#374151" }}>
            Hi {attendeeName}, thank you for attending <strong>{eventName}</strong>. We hope you had a great experience!
          </Text>
          <Text style={{ fontSize: "14px", color: "#374151" }}>
            We'd love to hear your feedback. Stay tuned for a follow-up survey.
          </Text>
          <Hr style={{ margin: "24px 0", borderColor: "#e5e7eb" }} />
          <Text style={{ fontSize: "12px", color: "#9ca3af" }}>
            Attendly - Event Management Platform
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

**Step 4: Commit**

```bash
git add apps/web/src/features/emails/lib/templates/
git commit -m "feat(email): add React Email templates for confirmation, reminder, and post-event"
```

---

### Task 6: Create segmentation query builder

**Files:**
- Create: `apps/web/src/features/emails/lib/segments.ts`

**Step 1: Create segments utility**

Create `apps/web/src/features/emails/lib/segments.ts`:

```typescript
import { createClient } from "@/shared/utils/supabase/server";

type SegmentFilters = {
  ticket_type_ids?: string[];
  statuses?: string[];
  checked_in?: boolean;
};

export async function getSegmentedRecipients(
  eventId: string,
  filters?: SegmentFilters
) {
  const supabase = await createClient();

  let query = supabase
    .from("registrations")
    .select("id, name, email, status, ticket_type_id, ticket_types(name)")
    .eq("event_id", eventId)
    .eq("unsubscribed", false);

  if (filters?.ticket_type_ids && filters.ticket_type_ids.length > 0) {
    query = query.in("ticket_type_id", filters.ticket_type_ids);
  }

  if (filters?.statuses && filters.statuses.length > 0) {
    query = query.in("status", filters.statuses);
  } else {
    // Default: only confirmed and checked-in attendees
    query = query.in("status", ["confirmed", "checked_in"]);
  }

  if (filters?.checked_in === true) {
    query = query.eq("status", "checked_in");
  } else if (filters?.checked_in === false) {
    query = query.neq("status", "checked_in");
  }

  const { data, error } = await query.order("name");

  if (error) throw new Error(error.message);
  return data;
}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/emails/lib/segments.ts
git commit -m "feat(email): add segmentation query builder for targeting recipients"
```

---

### Task 7: Create email server actions

**Files:**
- Create: `apps/web/src/features/emails/actions.ts`

**Step 1: Create server actions**

Create `apps/web/src/features/emails/actions.ts`:

```typescript
"use server";

import { createClient } from "@/shared/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { resend } from "./lib/resend";
import { sendEmail, substituteVariables } from "./lib/send-email";
import { getSegmentedRecipients } from "./lib/segments";

export async function createEmailTemplate(data: {
  organizationId: string;
  name: string;
  subject: string;
  bodyHtml: string;
  type: string;
}) {
  const supabase = await createClient();

  const { data: template, error } = await supabase
    .from("email_templates")
    .insert({
      organization_id: data.organizationId,
      name: data.name,
      subject: data.subject,
      body_html: data.bodyHtml,
      type: data.type,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return template;
}

export async function updateEmailTemplate(
  templateId: string,
  data: {
    name?: string;
    subject?: string;
    bodyHtml?: string;
    type?: string;
  }
) {
  const supabase = await createClient();

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.name !== undefined) update.name = data.name;
  if (data.subject !== undefined) update.subject = data.subject;
  if (data.bodyHtml !== undefined) update.body_html = data.bodyHtml;
  if (data.type !== undefined) update.type = data.type;

  const { error } = await supabase
    .from("email_templates")
    .update(update)
    .eq("id", templateId);

  if (error) throw new Error(error.message);
}

export async function deleteEmailTemplate(templateId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("email_templates")
    .delete()
    .eq("id", templateId);

  if (error) throw new Error(error.message);
}

export async function createEmailAutomation(data: {
  eventId: string;
  trigger: string;
  templateId: string;
  enabled?: boolean;
}) {
  const supabase = await createClient();

  const { data: automation, error } = await supabase
    .from("email_automations")
    .insert({
      event_id: data.eventId,
      trigger: data.trigger,
      template_id: data.templateId,
      enabled: data.enabled ?? true,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${data.eventId}/emails`);
  return automation;
}

export async function toggleEmailAutomation(automationId: string, enabled: boolean) {
  const supabase = await createClient();

  const { data: automation, error: fetchError } = await supabase
    .from("email_automations")
    .select("event_id")
    .eq("id", automationId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const { error } = await supabase
    .from("email_automations")
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq("id", automationId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${automation.event_id}/emails`);
}

export async function deleteEmailAutomation(automationId: string) {
  const supabase = await createClient();

  const { data: automation, error: fetchError } = await supabase
    .from("email_automations")
    .select("event_id")
    .eq("id", automationId)
    .single();

  if (fetchError) throw new Error(fetchError.message);

  const { error } = await supabase
    .from("email_automations")
    .delete()
    .eq("id", automationId);

  if (error) throw new Error(error.message);

  revalidatePath(`/events/${automation.event_id}/emails`);
}

export async function sendBroadcastEmail(data: {
  eventId: string;
  subject: string;
  bodyHtml: string;
  filters?: {
    ticket_type_ids?: string[];
    statuses?: string[];
    checked_in?: boolean;
  };
}) {
  const supabase = await createClient();

  // Get event and org info
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id, title, organization_id")
    .eq("id", data.eventId)
    .single();

  if (eventError || !event) throw new Error("Event not found");

  // Get filtered recipients
  const recipients = await getSegmentedRecipients(data.eventId, data.filters);

  if (recipients.length === 0) {
    throw new Error("No recipients match the selected filters");
  }

  let sentCount = 0;
  let failedCount = 0;

  // Send in batches of 50
  for (let i = 0; i < recipients.length; i += 50) {
    const batch = recipients.slice(i, i + 50);

    const results = await Promise.allSettled(
      batch.map((recipient) => {
        const variables: Record<string, string> = {
          attendee_name: recipient.name ?? "Attendee",
          event_name: event.title,
        };
        const subject = substituteVariables(data.subject, variables);
        const html = substituteVariables(data.bodyHtml, variables);

        return sendEmail({
          organizationId: event.organization_id,
          eventId: data.eventId,
          to: { email: recipient.email, name: recipient.name },
          subject,
          html,
        });
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") sentCount++;
      else failedCount++;
    }
  }

  revalidatePath(`/events/${data.eventId}/emails`);

  return { sentCount, failedCount, totalRecipients: recipients.length };
}

export async function sendRegistrationConfirmationEmail(
  eventId: string,
  registration: { name: string; email: string; ticketTypeName: string }
) {
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("title, start_date, slug, organization_id, organizations(slug)")
    .eq("id", eventId)
    .single();

  if (!event) return;

  // Check if on_registration automation is enabled
  const { data: automation } = await supabase
    .from("email_automations")
    .select("enabled")
    .eq("event_id", eventId)
    .eq("trigger", "on_registration")
    .single();

  if (!automation?.enabled) return;

  const orgSlug = (event.organizations as { slug: string })?.slug ?? "";
  const eventUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL ? "" : ""}/${orgSlug}/${event.slug}`;

  const { render } = await import("@react-email/components");
  const { RegistrationConfirmation } = await import("./lib/templates/registration-confirmation");

  const html = await render(
    RegistrationConfirmation({
      attendeeName: registration.name,
      eventName: event.title,
      eventDate: new Date(event.start_date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      eventUrl,
      ticketType: registration.ticketTypeName,
    })
  );

  try {
    await sendEmail({
      organizationId: event.organization_id,
      eventId,
      to: { email: registration.email, name: registration.name },
      subject: `You're registered for ${event.title}!`,
      html,
    });
  } catch {
    // Don't fail registration if email fails
    console.error("Failed to send registration confirmation email");
  }
}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/emails/actions.ts
git commit -m "feat(email): add server actions for templates, automations, and broadcast sends"
```

---

### Task 8: Create email queries

**Files:**
- Create: `apps/web/src/features/emails/queries.ts`

**Step 1: Create queries**

Create `apps/web/src/features/emails/queries.ts`:

```typescript
import { createClient } from "@/shared/utils/supabase/server";

export async function getEmailTemplatesByOrg(organizationId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export async function getEmailLogsByEvent(eventId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("email_logs")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return data;
}

export async function getEmailAutomationsByEvent(eventId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("email_automations")
    .select("*, email_templates(name, subject)")
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);
  return data;
}

export async function getEmailStats(eventId: string) {
  const supabase = await createClient();

  const { data: logs, error } = await supabase
    .from("email_logs")
    .select("status")
    .eq("event_id", eventId);

  if (error) throw new Error(error.message);

  const stats = {
    total: logs.length,
    sent: 0,
    delivered: 0,
    failed: 0,
    bounced: 0,
  };

  for (const log of logs) {
    if (log.status === "sent") stats.sent++;
    else if (log.status === "delivered") stats.delivered++;
    else if (log.status === "failed") stats.failed++;
    else if (log.status === "bounced") stats.bounced++;
  }

  return stats;
}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/emails/queries.ts
git commit -m "feat(email): add email queries for templates, logs, automations, and stats"
```

---

### Task 9: Create email dashboard UI components

**Files:**
- Create: `apps/web/src/features/emails/components/email-dashboard.tsx`
- Create: `apps/web/src/features/emails/components/email-log-table.tsx`

**Step 1: Create email log table**

Create `apps/web/src/features/emails/components/email-log-table.tsx`:

```tsx
"use client";

import { Badge } from "@/shared/components/ui/badge";

type EmailLog = {
  id: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  status: string;
  sent_at: string | null;
  error: string | null;
  created_at: string;
};

const statusVariant: Record<string, "success" | "destructive" | "warning" | "default"> = {
  sent: "success",
  delivered: "success",
  failed: "destructive",
  bounced: "destructive",
  queued: "warning",
};

export function EmailLogTable({ logs }: { logs: EmailLog[] }) {
  if (logs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No emails sent yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/50">
          <tr>
            <th className="px-4 py-2.5 text-left font-medium">Recipient</th>
            <th className="px-4 py-2.5 text-left font-medium">Subject</th>
            <th className="px-4 py-2.5 text-left font-medium">Status</th>
            <th className="px-4 py-2.5 text-left font-medium">Sent</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b last:border-0">
              <td className="px-4 py-2.5">
                <div className="font-medium">{log.recipient_name ?? "—"}</div>
                <div className="text-xs text-muted-foreground">{log.recipient_email}</div>
              </td>
              <td className="px-4 py-2.5 max-w-[200px] truncate">{log.subject}</td>
              <td className="px-4 py-2.5">
                <Badge variant={statusVariant[log.status] ?? "default"}>
                  {log.status}
                </Badge>
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {log.sent_at
                  ? new Date(log.sent_at).toLocaleString()
                  : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

**Step 2: Create email dashboard**

Create `apps/web/src/features/emails/components/email-dashboard.tsx`:

```tsx
"use client";

import { Mail, Send, AlertTriangle, CheckCircle } from "lucide-react";
import { Card } from "@/shared/components/ui/card";

type EmailStats = {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  bounced: number;
};

export function EmailDashboard({ stats }: { stats: EmailStats }) {
  const cards = [
    { label: "Total Sent", value: stats.total, icon: Mail },
    { label: "Delivered", value: stats.sent + stats.delivered, icon: CheckCircle },
    { label: "Failed", value: stats.failed, icon: AlertTriangle },
    { label: "Bounced", value: stats.bounced, icon: Send },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-muted p-2">
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add apps/web/src/features/emails/components/email-dashboard.tsx apps/web/src/features/emails/components/email-log-table.tsx
git commit -m "feat(email): add email dashboard stats and log table components"
```

---

### Task 10: Create compose email and automation UI components

**Files:**
- Create: `apps/web/src/features/emails/components/compose-email.tsx`
- Create: `apps/web/src/features/emails/components/automation-list.tsx`

**Step 1: Create compose email component**

Create `apps/web/src/features/emails/components/compose-email.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Send, X } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Textarea } from "@/shared/components/ui";
import { sendBroadcastEmail } from "../actions";

type TicketType = {
  id: string;
  name: string;
};

export function ComposeEmail({
  eventId,
  ticketTypes,
  onClose,
  onSent,
}: {
  eventId: string;
  ticketTypes: TicketType[];
  onClose: () => void;
  onSent: () => void;
}) {
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [selectedTicketTypes, setSelectedTicketTypes] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const statuses = [
    { value: "confirmed", label: "Confirmed" },
    { value: "checked_in", label: "Checked In" },
    { value: "pending", label: "Pending" },
    { value: "cancelled", label: "Cancelled" },
  ];

  async function handleSend() {
    if (!subject.trim() || !bodyHtml.trim()) {
      toast.error("Subject and body are required");
      return;
    }

    if (!confirm("Send this email to the selected recipients?")) return;

    setLoading(true);
    try {
      const result = await sendBroadcastEmail({
        eventId,
        subject,
        bodyHtml: `<div style="font-family: system-ui, sans-serif;">${bodyHtml.replace(/\n/g, "<br/>")}</div>`,
        filters: {
          ticket_type_ids: selectedTicketTypes.length > 0 ? selectedTicketTypes : undefined,
          statuses: selectedStatuses.length > 0 ? selectedStatuses : undefined,
        },
      });
      toast.success(`Sent ${result.sentCount} emails (${result.failedCount} failed)`);
      onSent();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send emails");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Compose Broadcast Email</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Subject *</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Important update about {{event_name}}"
            />
            <p className="text-xs text-muted-foreground">
              Supports variables: {"{{attendee_name}}"}, {"{{event_name}}"}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Message *</label>
            <Textarea
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              rows={8}
              placeholder="Write your email message here..."
            />
          </div>

          <div className="space-y-3 rounded-lg border p-4">
            <h3 className="text-sm font-medium">Audience Filters (optional)</h3>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Ticket Types</label>
              <div className="flex flex-wrap gap-2">
                {ticketTypes.map((tt) => (
                  <label key={tt.id} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedTicketTypes.includes(tt.id)}
                      onChange={(e) =>
                        setSelectedTicketTypes((prev) =>
                          e.target.checked
                            ? [...prev, tt.id]
                            : prev.filter((id) => id !== tt.id)
                        )
                      }
                      className="rounded"
                    />
                    {tt.name}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <div className="flex flex-wrap gap-2">
                {statuses.map((s) => (
                  <label key={s.value} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedStatuses.includes(s.value)}
                      onChange={(e) =>
                        setSelectedStatuses((prev) =>
                          e.target.checked
                            ? [...prev, s.value]
                            : prev.filter((v) => v !== s.value)
                        )
                      }
                      className="rounded"
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={loading || !subject.trim() || !bodyHtml.trim()}>
              <Send className="h-4 w-4" />
              {loading ? "Sending..." : "Send Email"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Create automation list component**

Create `apps/web/src/features/emails/components/automation-list.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { toggleEmailAutomation, deleteEmailAutomation } from "../actions";

type Automation = {
  id: string;
  trigger: string;
  enabled: boolean;
  email_templates: { name: string; subject: string } | null;
};

const triggerLabels: Record<string, string> = {
  on_registration: "On Registration",
  pre_event_24h: "24 Hours Before Event",
  pre_event_1h: "1 Hour Before Event",
  post_event: "After Event Ends",
};

export function AutomationList({
  initialAutomations,
}: {
  initialAutomations: Automation[];
}) {
  const [automations, setAutomations] = useState(initialAutomations);
  const [isPending, startTransition] = useTransition();

  function handleToggle(id: string, enabled: boolean) {
    startTransition(async () => {
      try {
        await toggleEmailAutomation(id, !enabled);
        setAutomations((prev) =>
          prev.map((a) => (a.id === id ? { ...a, enabled: !enabled } : a))
        );
        toast.success(enabled ? "Automation disabled" : "Automation enabled");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update");
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this automation?")) return;
    startTransition(async () => {
      try {
        await deleteEmailAutomation(id);
        setAutomations((prev) => prev.filter((a) => a.id !== id));
        toast.success("Automation deleted");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  }

  if (automations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No automations configured.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {automations.map((auto) => (
        <Card key={auto.id} className="flex items-center justify-between p-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{triggerLabels[auto.trigger] ?? auto.trigger}</h3>
              <Badge variant={auto.enabled ? "success" : "default"}>
                {auto.enabled ? "Active" : "Disabled"}
              </Badge>
            </div>
            {auto.email_templates && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                Template: {auto.email_templates.name}
              </p>
            )}
          </div>
          <div className="flex shrink-0 gap-1 ml-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleToggle(auto.id, auto.enabled)}
              disabled={isPending}
            >
              {auto.enabled ? "Disable" : "Enable"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(auto.id)}
              disabled={isPending}
              className="hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add apps/web/src/features/emails/components/compose-email.tsx apps/web/src/features/emails/components/automation-list.tsx
git commit -m "feat(email): add compose email and automation management UI components"
```

---

### Task 11: Create the emails page and add tab to event layout

**Files:**
- Create: `apps/web/src/app/(organizer)/events/[eventId]/emails/page.tsx`
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/layout.tsx`

**Step 1: Create the emails page**

Create `apps/web/src/app/(organizer)/events/[eventId]/emails/page.tsx`:

```tsx
import { createClient } from "@/shared/utils/supabase/server";
import { getEmailLogsByEvent, getEmailAutomationsByEvent, getEmailStats } from "@/features/emails/queries";
import { getTicketTypesByEvent } from "@/features/tickets/queries";
import { EmailDashboard } from "@/features/emails/components/email-dashboard";
import { EmailLogTable } from "@/features/emails/components/email-log-table";
import { AutomationList } from "@/features/emails/components/automation-list";
import { EmailsPageClient } from "@/features/emails/components/emails-page-client";

export default async function EmailsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const [stats, logs, automations, ticketTypes] = await Promise.all([
    getEmailStats(eventId),
    getEmailLogsByEvent(eventId),
    getEmailAutomationsByEvent(eventId),
    getTicketTypesByEvent(eventId),
  ]);

  return (
    <div className="space-y-8">
      <EmailsPageClient eventId={eventId} ticketTypes={ticketTypes} />
      <EmailDashboard stats={stats} />

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Automations</h2>
        <AutomationList initialAutomations={automations} />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Recent Emails</h2>
        <EmailLogTable logs={logs} />
      </div>
    </div>
  );
}
```

**Step 2: Create the client wrapper for the compose button**

Create `apps/web/src/features/emails/components/emails-page-client.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { ComposeEmail } from "./compose-email";

type TicketType = {
  id: string;
  name: string;
};

export function EmailsPageClient({
  eventId,
  ticketTypes,
}: {
  eventId: string;
  ticketTypes: TicketType[];
}) {
  const [showCompose, setShowCompose] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Emails</h2>
        <Button onClick={() => setShowCompose(true)}>
          <Plus className="h-4 w-4" />
          Compose Email
        </Button>
      </div>

      {showCompose && (
        <ComposeEmail
          eventId={eventId}
          ticketTypes={ticketTypes}
          onClose={() => setShowCompose(false)}
          onSent={() => window.location.reload()}
        />
      )}
    </>
  );
}
```

**Step 3: Add Emails tab to event layout**

In `apps/web/src/app/(organizer)/events/[eventId]/layout.tsx`, add to the `tabs` array after the "Rooms" tab:

```typescript
{ href: `/events/${eventId}/emails`, label: "Emails", icon: Mail },
```

And add `Mail` to the lucide-react import:

```typescript
import { ArrowLeft, Calendar, Users, QrCode, BarChart3, Settings, Mic, DoorOpen, Mail } from "lucide-react";
```

**Step 4: Commit**

```bash
git add apps/web/src/app/\(organizer\)/events/\[eventId\]/emails/ apps/web/src/features/emails/components/emails-page-client.tsx apps/web/src/app/\(organizer\)/events/\[eventId\]/layout.tsx
git commit -m "feat(email): add emails page with compose, automations, and log table"
```

---

### Task 12: Integrate registration confirmation email into existing registration flow

**Files:**
- Modify: `apps/web/src/features/registration/actions.ts`

**Step 1: Add email trigger to registerForEvent action**

At the end of the `registerForEvent` function in `apps/web/src/features/registration/actions.ts`, after the successful insert and before the return statement, add:

```typescript
// Send confirmation email (non-blocking)
import { sendRegistrationConfirmationEmail } from "@/features/emails/actions";

// Add this at the end of registerForEvent, before `return registration`:
const { data: ticketType } = await supabase
  .from("ticket_types")
  .select("name")
  .eq("id", data.ticket_type_id)
  .single();

sendRegistrationConfirmationEmail(data.event_id, {
  name: data.name,
  email: data.email,
  ticketTypeName: ticketType?.name ?? "General",
}).catch(() => {});
```

Note: The import should be at the top of the file. The `.catch(() => {})` ensures registration doesn't fail if email fails.

**Step 2: Verify the app still builds**

Run:
```bash
cd /Users/bertwinromero/Documents/billionsoulharves-workspace/attendly && pnpm build --filter @attendly/web
```

**Step 3: Commit**

```bash
git add apps/web/src/features/registration/actions.ts
git commit -m "feat(email): trigger confirmation email on registration"
```

---

### Task 13: Create Vercel Cron endpoint for scheduled emails

**Files:**
- Create: `apps/web/src/app/api/cron/email-reminders/route.ts`
- Modify: `apps/web/vercel.json` (create if not exists)

**Step 1: Create the cron route**

Create `apps/web/src/app/api/cron/email-reminders/route.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";
import { resend } from "@/features/emails/lib/resend";
import { render } from "@react-email/components";
import { EventReminder } from "@/features/emails/lib/templates/event-reminder";
import { PostEvent } from "@/features/emails/lib/templates/post-event";

// Use service role for cron (no user session)
function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();

  // Process pre-event reminders (24h and 1h)
  await processReminders(supabase, now);

  // Process post-event emails
  await processPostEvent(supabase, now);

  return Response.json({ ok: true, timestamp: now.toISOString() });
}

async function processReminders(supabase: ReturnType<typeof createServiceClient>, now: Date) {
  const triggers = [
    { trigger: "pre_event_24h", hoursAhead: 24, timeUntil: "in 24 hours" },
    { trigger: "pre_event_1h", hoursAhead: 1, timeUntil: "in 1 hour" },
  ];

  for (const { trigger, hoursAhead, timeUntil } of triggers) {
    const windowStart = new Date(now.getTime() + (hoursAhead - 0.5) * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + (hoursAhead + 0.5) * 60 * 60 * 1000);

    // Find enabled automations for events starting in the window
    const { data: automations } = await supabase
      .from("email_automations")
      .select("id, event_id, events(id, title, start_date, slug, organization_id, organizations(slug))")
      .eq("trigger", trigger)
      .eq("enabled", true);

    if (!automations) continue;

    for (const auto of automations) {
      const event = auto.events as any;
      if (!event) continue;

      const startDate = new Date(event.start_date);
      if (startDate < windowStart || startDate > windowEnd) continue;

      // Get confirmed registrations
      const { data: registrations } = await supabase
        .from("registrations")
        .select("id, name, email")
        .eq("event_id", event.id)
        .in("status", ["confirmed"])
        .eq("unsubscribed", false);

      if (!registrations || registrations.length === 0) continue;

      for (const reg of registrations) {
        // Check if already sent (idempotency)
        const { data: existing } = await supabase
          .from("email_logs")
          .select("id")
          .eq("event_id", event.id)
          .eq("recipient_email", reg.email)
          .like("subject", `%${trigger}%`)
          .limit(1);

        if (existing && existing.length > 0) continue;

        const html = await render(
          EventReminder({
            attendeeName: reg.name ?? "Attendee",
            eventName: event.title,
            eventDate: new Date(event.start_date).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }),
            eventUrl: `/${(event.organizations as any)?.slug}/${event.slug}`,
            timeUntil,
          })
        );

        const subject = `[Reminder] ${event.title} starts ${timeUntil}`;

        const { data: sent, error } = await resend.emails.send({
          from: "Attendly <noreply@attendly.app>",
          to: reg.email,
          subject,
          html,
        });

        await supabase.from("email_logs").insert({
          organization_id: event.organization_id,
          event_id: event.id,
          recipient_email: reg.email,
          recipient_name: reg.name,
          subject,
          status: error ? "failed" : "sent",
          resend_id: sent?.id ?? null,
          sent_at: error ? null : new Date().toISOString(),
          error: error?.message ?? null,
        });
      }
    }
  }
}

async function processPostEvent(supabase: ReturnType<typeof createServiceClient>, now: Date) {
  // Find events that ended in the last hour
  const windowStart = new Date(now.getTime() - 60 * 60 * 1000);

  const { data: automations } = await supabase
    .from("email_automations")
    .select("id, event_id, events(id, title, end_date, organization_id)")
    .eq("trigger", "post_event")
    .eq("enabled", true);

  if (!automations) return;

  for (const auto of automations) {
    const event = auto.events as any;
    if (!event) continue;

    const endDate = new Date(event.end_date);
    if (endDate < windowStart || endDate > now) continue;

    const { data: registrations } = await supabase
      .from("registrations")
      .select("id, name, email")
      .eq("event_id", event.id)
      .eq("status", "checked_in")
      .eq("unsubscribed", false);

    if (!registrations || registrations.length === 0) continue;

    for (const reg of registrations) {
      const { data: existing } = await supabase
        .from("email_logs")
        .select("id")
        .eq("event_id", event.id)
        .eq("recipient_email", reg.email)
        .like("subject", "%Thanks for attending%")
        .limit(1);

      if (existing && existing.length > 0) continue;

      const html = await render(
        PostEvent({
          attendeeName: reg.name ?? "Attendee",
          eventName: event.title,
        })
      );

      const subject = `Thanks for attending ${event.title}!`;

      const { data: sent, error } = await resend.emails.send({
        from: "Attendly <noreply@attendly.app>",
        to: reg.email,
        subject,
        html,
      });

      await supabase.from("email_logs").insert({
        organization_id: event.organization_id,
        event_id: event.id,
        recipient_email: reg.email,
        recipient_name: reg.name,
        subject,
        status: error ? "failed" : "sent",
        resend_id: sent?.id ?? null,
        sent_at: error ? null : new Date().toISOString(),
        error: error?.message ?? null,
      });
    }
  }
}
```

**Step 2: Create or update vercel.json**

Create `apps/web/vercel.json` (if it doesn't exist):

```json
{
  "crons": [
    {
      "path": "/api/cron/email-reminders",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Step 3: Add env vars to .env.local.example**

Append to `apps/web/.env.local.example`:
```
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
CRON_SECRET=your-cron-secret
```

**Step 4: Commit**

```bash
git add apps/web/src/app/api/cron/email-reminders/ apps/web/vercel.json apps/web/.env.local.example
git commit -m "feat(email): add Vercel Cron endpoint for scheduled reminders and post-event emails"
```

---

### Task 14: Verify the full feature works end-to-end

**Step 1: Ensure Supabase is running**

Run:
```bash
cd /Users/bertwinromero/Documents/billionsoulharves-workspace/attendly && npx supabase status --local
```

**Step 2: Run the migration if not already applied**

Run:
```bash
cd /Users/bertwinromero/Documents/billionsoulharves-workspace/attendly && npx supabase migration up --local
```

**Step 3: Build the web app**

Run:
```bash
cd /Users/bertwinromero/Documents/billionsoulharves-workspace/attendly && pnpm build --filter @attendly/web
```
Expected: Build succeeds with no errors.

**Step 4: Start the dev server and verify the Emails tab appears**

Run:
```bash
cd /Users/bertwinromero/Documents/billionsoulharves-workspace/attendly && pnpm dev --filter @attendly/web
```

Navigate to an event detail page and verify:
- "Emails" tab appears in the event navigation
- Clicking it shows the email dashboard with stats, automations, and log table
- "Compose Email" button opens the modal
- Audience filters (ticket types, statuses) are shown

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat(email): email & communications feature complete"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Install dependencies | package.json, .env |
| 2 | Database migration | 012_email_communications.sql |
| 3 | Constants and schemas | constants/index.ts, schemas/email.ts |
| 4 | Resend client + send utility | lib/resend.ts, lib/send-email.ts |
| 5 | React Email templates | 3 template components |
| 6 | Segmentation query builder | lib/segments.ts |
| 7 | Server actions | actions.ts |
| 8 | Queries | queries.ts |
| 9 | Dashboard + log table UI | 2 components |
| 10 | Compose + automation UI | 2 components |
| 11 | Emails page + layout tab | page.tsx, layout.tsx |
| 12 | Registration email integration | registration/actions.ts |
| 13 | Cron endpoint | api/cron/email-reminders/route.ts |
| 14 | End-to-end verification | Build + manual test |

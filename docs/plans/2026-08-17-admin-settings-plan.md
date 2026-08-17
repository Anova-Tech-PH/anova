# Per-Event Admin Settings Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Whova-style Admin Settings page under Attendees with invitation code, per-event admins, check-in staff, and cross-org template sharing.

**Architecture:** New migration adds `event_admins`, `shared_templates`, `template_requests` tables and invitation code columns to `events`. A new `has_event_access` SQL function checks both org membership and event_admins. Feature module at `src/features/admin-settings/` with server actions, queries, and components. Single scrollable page at `/events/[eventId]/admin-settings`.

**Tech Stack:** Next.js 16 server actions, Supabase (PostgreSQL + RLS), React 19, Tailwind 4, sonner toasts, lucide-react icons.

---

## Reference Files

Before starting any task, read these files to understand existing patterns:

- **Migration pattern:** `packages/supabase/migrations/092_photo_gallery_overhaul.sql`
- **Server action pattern:** `apps/web/src/features/team/actions.ts`
- **Query pattern:** `apps/web/src/features/team/queries.ts`
- **Component pattern:** `apps/web/src/features/team/components/team-manager.tsx`
- **Event sidebar:** `apps/web/src/app/(organizer)/events/[eventId]/layout.tsx`
- **Events table schema:** `packages/supabase/migrations/003_events.sql`
- **Org members schema:** `packages/supabase/migrations/001_organizations.sql`
- **Check-in role migration:** `packages/supabase/migrations/022_check_in_role.sql`
- **Event templates schema:** `packages/supabase/migrations/026_event_templates.sql`

---

### Task 1: Database Migration

**Files:**
- Create: `packages/supabase/migrations/094_admin_settings.sql`

**Step 1: Write the migration**

```sql
-- Migration 094: Per-event admin settings
-- Adds invitation code to events, event_admins table, shared_templates, template_requests

-- 1. Add invitation code columns to events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS invitation_code TEXT,
  ADD COLUMN IF NOT EXISTS invitation_code_required BOOLEAN NOT NULL DEFAULT false;

-- 2. Per-event admins and check-in staff
CREATE TABLE public.event_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'check_in')),
  added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, email)
);

ALTER TABLE public.event_admins ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_admins TO authenticated;

CREATE INDEX idx_event_admins_event ON public.event_admins(event_id);
CREATE INDEX idx_event_admins_user ON public.event_admins(user_id) WHERE user_id IS NOT NULL;

-- 3. Cross-org template sharing
CREATE TABLE public.shared_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_email TEXT,
  shared_with_org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (shared_with_email IS NOT NULL OR shared_with_org_id IS NOT NULL)
);

ALTER TABLE public.shared_templates ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_templates TO authenticated;

CREATE INDEX idx_shared_templates_source ON public.shared_templates(source_event_id);
CREATE INDEX idx_shared_templates_email ON public.shared_templates(shared_with_email) WHERE shared_with_email IS NOT NULL;
CREATE INDEX idx_shared_templates_org ON public.shared_templates(shared_with_org_id) WHERE shared_with_org_id IS NOT NULL;

-- 4. Template requests
CREATE TABLE public.template_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requesting_event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.template_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_requests TO authenticated;

CREATE INDEX idx_template_requests_requesting ON public.template_requests(requesting_event_id);
CREATE INDEX idx_template_requests_target ON public.template_requests(target_event_id);

-- 5. has_event_access function — checks org membership OR event_admins
CREATE OR REPLACE FUNCTION public.has_event_access(
  _event_id UUID,
  _min_role TEXT DEFAULT 'viewer'
) RETURNS BOOLEAN AS $$
DECLARE
  _org_id UUID;
  _event_role TEXT;
  _event_rank INT;
  _min_rank INT;
BEGIN
  -- First check org membership (covers all events in the org)
  SELECT organization_id INTO _org_id
  FROM public.events
  WHERE id = _event_id;

  IF _org_id IS NOT NULL AND public.is_org_member(_org_id, _min_role) THEN
    RETURN true;
  END IF;

  -- Then check event_admins table
  SELECT role INTO _event_role
  FROM public.event_admins
  WHERE event_id = _event_id
    AND user_id = auth.uid();

  IF _event_role IS NULL THEN
    RETURN false;
  END IF;

  _event_rank := CASE _event_role
    WHEN 'admin' THEN 4
    WHEN 'check_in' THEN 2
    ELSE 0
  END;

  _min_rank := CASE _min_role
    WHEN 'owner' THEN 5
    WHEN 'admin' THEN 4
    WHEN 'editor' THEN 3
    WHEN 'check_in' THEN 2
    WHEN 'viewer' THEN 1
    ELSE 0
  END;

  RETURN _event_rank >= _min_rank;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 6. RLS Policies

-- event_admins: org admins + event admins can manage
CREATE POLICY "Event admins viewable by event participants"
  ON public.event_admins FOR SELECT TO authenticated
  USING (has_event_access(event_id, 'viewer'));

CREATE POLICY "Admins can manage event admins"
  ON public.event_admins FOR INSERT TO authenticated
  WITH CHECK (has_event_access(event_id, 'admin'));

CREATE POLICY "Admins can update event admins"
  ON public.event_admins FOR UPDATE TO authenticated
  USING (has_event_access(event_id, 'admin'));

CREATE POLICY "Admins can delete event admins"
  ON public.event_admins FOR DELETE TO authenticated
  USING (has_event_access(event_id, 'admin'));

-- shared_templates: shared_by user can manage, recipients can view
CREATE POLICY "Users can view shared templates they sent or received"
  ON public.shared_templates FOR SELECT TO authenticated
  USING (
    shared_by = auth.uid()
    OR shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR (shared_with_org_id IS NOT NULL AND is_org_member(shared_with_org_id))
  );

CREATE POLICY "Admins can share templates"
  ON public.shared_templates FOR INSERT TO authenticated
  WITH CHECK (shared_by = auth.uid());

CREATE POLICY "Users can update shared templates they're involved in"
  ON public.shared_templates FOR UPDATE TO authenticated
  USING (
    shared_by = auth.uid()
    OR shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR (shared_with_org_id IS NOT NULL AND is_org_member(shared_with_org_id, 'admin'))
  );

CREATE POLICY "Senders can delete shared templates"
  ON public.shared_templates FOR DELETE TO authenticated
  USING (shared_by = auth.uid());

-- template_requests: requester + target event admins can view/manage
CREATE POLICY "Users can view template requests they sent or received"
  ON public.template_requests FOR SELECT TO authenticated
  USING (
    requested_by = auth.uid()
    OR has_event_access(target_event_id, 'admin')
  );

CREATE POLICY "Users can create template requests"
  ON public.template_requests FOR INSERT TO authenticated
  WITH CHECK (requested_by = auth.uid());

CREATE POLICY "Target admins can update template requests"
  ON public.template_requests FOR UPDATE TO authenticated
  USING (has_event_access(target_event_id, 'admin'));

CREATE POLICY "Requesters can delete template requests"
  ON public.template_requests FOR DELETE TO authenticated
  USING (requested_by = auth.uid());
```

**Step 2: Run the migration**

Run: `cd packages/supabase && npx supabase migration up`
Expected: Migration applied successfully, no errors.

**Step 3: Verify tables exist**

Run: `cd packages/supabase && npx supabase db dump --schema public | grep -E "event_admins|shared_templates|template_requests|invitation_code"`
Expected: All table names and column names appear.

**Step 4: Commit**

```bash
git add packages/supabase/migrations/094_admin_settings.sql
git commit -m "feat: add admin settings migration (event_admins, shared_templates, template_requests, invitation_code)"
```

---

### Task 2: Invitation Code Actions & Queries

**Files:**
- Create: `apps/web/src/features/admin-settings/actions.ts`
- Create: `apps/web/src/features/admin-settings/queries.ts`

**Step 1: Create queries file**

```typescript
// apps/web/src/features/admin-settings/queries.ts
"use server";

import { createClient } from "@attendly/ui/supabase/server";

export type EventAdmin = {
  id: string;
  event_id: string;
  email: string;
  user_id: string | null;
  role: string;
  added_by: string;
  added_by_name: string | null;
  display_name: string | null;
  created_at: string;
};

export async function getInvitationCode(eventId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("invitation_code, invitation_code_required")
    .eq("id", eventId)
    .single();

  if (error) throw error;
  return {
    code: data.invitation_code as string | null,
    required: data.invitation_code_required as boolean,
  };
}

export async function getEventAdmins(eventId: string): Promise<EventAdmin[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_admins")
    .select("id, event_id, email, user_id, role, added_by, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  if (!data?.length) return [];

  // Get display names for users who have signed up
  const userIds = data
    .map((a) => a.user_id)
    .filter((id): id is string => id !== null);
  const addedByIds = [...new Set(data.map((a) => a.added_by))];
  const allUserIds = [...new Set([...userIds, ...addedByIds])];

  let profileMap = new Map<string, string>();
  if (allUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", allUserIds);
    for (const p of profiles ?? []) {
      profileMap.set(p.id, p.full_name);
    }
  }

  return data.map((a) => ({
    ...a,
    display_name: a.user_id ? profileMap.get(a.user_id) ?? null : null,
    added_by_name: profileMap.get(a.added_by) ?? null,
  }));
}

export async function getOrgAdminsForEvent(eventId: string) {
  const supabase = await createClient();

  // Get org_id from event
  const { data: event } = await supabase
    .from("events")
    .select("organization_id")
    .eq("id", eventId)
    .single();

  if (!event) return [];

  const { data: members } = await supabase
    .from("organization_members")
    .select("id, user_id, role, created_at")
    .eq("organization_id", event.organization_id)
    .in("role", ["owner", "admin"])
    .order("created_at", { ascending: true });

  if (!members?.length) return [];

  const userIds = members.map((m) => m.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name])
  );

  // Get emails via auth
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  return members.map((m) => ({
    id: m.id,
    user_id: m.user_id,
    role: m.role as string,
    display_name: profileMap.get(m.user_id) ?? "Team Member",
    email: currentUser && m.user_id === currentUser.id ? currentUser.email ?? "" : "",
    created_at: m.created_at as string,
    is_org_level: true,
  }));
}

export async function getSharedTemplates(eventId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shared_templates")
    .select("id, source_event_id, shared_by, shared_with_email, shared_with_org_id, status, created_at")
    .eq("source_event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getTemplateRequests(eventId: string) {
  const supabase = await createClient();

  // Incoming requests (other events requesting this event's templates)
  const { data: incoming } = await supabase
    .from("template_requests")
    .select("id, requesting_event_id, requested_by, message, status, created_at")
    .eq("target_event_id", eventId)
    .order("created_at", { ascending: false });

  // Outgoing requests (this event requesting other events' templates)
  const { data: outgoing } = await supabase
    .from("template_requests")
    .select("id, target_event_id, requested_by, message, status, created_at")
    .eq("requesting_event_id", eventId)
    .order("created_at", { ascending: false });

  // Get event names for display
  const eventIds = [
    ...(incoming ?? []).map((r) => r.requesting_event_id),
    ...(outgoing ?? []).map((r) => r.target_event_id),
  ];

  let eventNameMap = new Map<string, string>();
  if (eventIds.length > 0) {
    const { data: events } = await supabase
      .from("events")
      .select("id, title")
      .in("id", eventIds);
    for (const e of events ?? []) {
      eventNameMap.set(e.id, e.title);
    }
  }

  // Get requester names
  const requesterIds = [...new Set([
    ...(incoming ?? []).map((r) => r.requested_by),
    ...(outgoing ?? []).map((r) => r.requested_by),
  ])];

  let requesterNameMap = new Map<string, string>();
  if (requesterIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", requesterIds);
    for (const p of profiles ?? []) {
      requesterNameMap.set(p.id, p.full_name);
    }
  }

  return {
    incoming: (incoming ?? []).map((r) => ({
      ...r,
      event_name: eventNameMap.get(r.requesting_event_id) ?? "Unknown Event",
      requester_name: requesterNameMap.get(r.requested_by) ?? "Unknown",
    })),
    outgoing: (outgoing ?? []).map((r) => ({
      ...r,
      event_name: eventNameMap.get(r.target_event_id) ?? "Unknown Event",
      requester_name: requesterNameMap.get(r.requested_by) ?? "Unknown",
    })),
  };
}
```

**Step 2: Create actions file**

```typescript
// apps/web/src/features/admin-settings/actions.ts
"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

// --- Invitation Code ---

export async function setInvitationCode(
  eventId: string,
  code: string,
  required: boolean
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("events")
    .update({
      invitation_code: code.trim() || null,
      invitation_code_required: required,
    })
    .eq("id", eventId);

  if (error) throw error;
  revalidatePath(`/events/${eventId}/admin-settings`);
}

// --- Event Admins ---

export async function addEventAdmin(
  eventId: string,
  email: string,
  role: "admin" | "check_in"
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Check if email is already an event admin
  const { data: existing } = await supabase
    .from("event_admins")
    .select("id")
    .eq("event_id", eventId)
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();

  if (existing) throw new Error("This email is already added to this event");

  // Try to find user_id by email
  const { data: lookupResult } = await supabase
    .rpc("lookup_user_by_email", { _email: email.toLowerCase().trim() })
    .maybeSingle();

  const userId = lookupResult ? (lookupResult as { id: string }).id : null;

  const { error } = await supabase.from("event_admins").insert({
    event_id: eventId,
    email: email.toLowerCase().trim(),
    user_id: userId,
    role,
    added_by: user.id,
  });

  if (error) throw error;
  revalidatePath(`/events/${eventId}/admin-settings`);
}

export async function updateEventAdminRole(
  adminId: string,
  eventId: string,
  newRole: "admin" | "check_in"
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("event_admins")
    .update({ role: newRole })
    .eq("id", adminId)
    .eq("event_id", eventId);

  if (error) throw error;
  revalidatePath(`/events/${eventId}/admin-settings`);
}

export async function removeEventAdmin(adminId: string, eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("event_admins")
    .delete()
    .eq("id", adminId)
    .eq("event_id", eventId);

  if (error) throw error;
  revalidatePath(`/events/${eventId}/admin-settings`);
}

// --- Template Sharing ---

export async function shareTemplate(
  eventId: string,
  shareWith: { email?: string; orgId?: string }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  if (!shareWith.email && !shareWith.orgId) {
    throw new Error("Must share with an email or organization");
  }

  const { error } = await supabase.from("shared_templates").insert({
    source_event_id: eventId,
    shared_by: user.id,
    shared_with_email: shareWith.email?.toLowerCase().trim() ?? null,
    shared_with_org_id: shareWith.orgId ?? null,
  });

  if (error) throw error;
  revalidatePath(`/events/${eventId}/admin-settings`);
}

export async function updateSharedTemplateStatus(
  templateId: string,
  status: "accepted" | "declined"
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("shared_templates")
    .update({ status })
    .eq("id", templateId);

  if (error) throw error;
  revalidatePath("/", "layout");
}

export async function requestTemplate(
  requestingEventId: string,
  targetEventId: string,
  message?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("template_requests").insert({
    requesting_event_id: requestingEventId,
    requested_by: user.id,
    target_event_id: targetEventId,
    message: message?.trim() || null,
  });

  if (error) throw error;
  revalidatePath(`/events/${requestingEventId}/admin-settings`);
}

export async function updateTemplateRequestStatus(
  requestId: string,
  eventId: string,
  status: "approved" | "declined"
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("template_requests")
    .update({ status })
    .eq("id", requestId);

  if (error) throw error;
  revalidatePath(`/events/${eventId}/admin-settings`);
}
```

**Step 3: Commit**

```bash
git add apps/web/src/features/admin-settings/actions.ts apps/web/src/features/admin-settings/queries.ts
git commit -m "feat: add admin settings server actions and queries"
```

---

### Task 3: Admin Settings Page Component — Invitation Code Section

**Files:**
- Create: `apps/web/src/features/admin-settings/components/invitation-code-section.tsx`

**Step 1: Create the component**

```tsx
// apps/web/src/features/admin-settings/components/invitation-code-section.tsx
"use client";

import { useState, useTransition } from "react";
import { Button, Input, Card } from "@attendly/ui/components";
import { KeyRound } from "lucide-react";
import { setInvitationCode } from "../actions";
import { toast } from "sonner";

interface InvitationCodeSectionProps {
  eventId: string;
  initialCode: string | null;
  initialRequired: boolean;
}

export function InvitationCodeSection({
  eventId,
  initialCode,
  initialRequired,
}: InvitationCodeSectionProps) {
  const [code, setCode] = useState(initialCode ?? "");
  const [required, setRequired] = useState(initialRequired);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      try {
        await setInvitationCode(eventId, code, required);
        toast.success("Invitation code updated");
      } catch {
        toast.error("Failed to update invitation code");
      }
    });
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <KeyRound className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Invitation Code</h2>
      </div>

      <p className="text-sm text-muted-foreground mb-4">
        The invitation code protects the privacy of your event attendees by
        preventing non-attendees from joining.
      </p>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200 mb-4">
        Note: To keep your event and attendee info private, please do not post
        your invitation code on social media (Twitter, Facebook, LinkedIn, etc.)
        or your event page.
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">
            Invitation Code
          </label>
          <div className="flex items-center gap-3">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. MYEVENT2025"
              className="max-w-xs"
              disabled={isPending}
            />
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "Saving..." : "Set Code"}
            </Button>
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => {
              setRequired(e.target.checked);
              startTransition(async () => {
                try {
                  await setInvitationCode(eventId, code, e.target.checked);
                  toast.success("Setting updated");
                } catch {
                  toast.error("Failed to update setting");
                  setRequired(!e.target.checked);
                }
              });
            }}
            className="h-4 w-4 rounded border-border accent-primary"
            disabled={isPending}
          />
          <span className="text-sm">
            Require invitation code to join this event (Recommended)
          </span>
        </label>
      </div>
    </Card>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/admin-settings/components/invitation-code-section.tsx
git commit -m "feat: add invitation code section component"
```

---

### Task 4: Event Admins Section Component

**Files:**
- Create: `apps/web/src/features/admin-settings/components/event-admins-section.tsx`

**Step 1: Create the component**

```tsx
// apps/web/src/features/admin-settings/components/event-admins-section.tsx
"use client";

import { useState, useTransition } from "react";
import {
  Button,
  Input,
  Card,
  ModalOverlay,
  useConfirm,
} from "@attendly/ui/components";
import { Shield, UserPlus, Trash2, Crown } from "lucide-react";
import { addEventAdmin, updateEventAdminRole, removeEventAdmin } from "../actions";
import type { EventAdmin } from "../queries";
import { toast } from "sonner";

interface OrgAdmin {
  id: string;
  user_id: string;
  role: string;
  display_name: string;
  email: string;
  created_at: string;
  is_org_level: boolean;
}

interface EventAdminsSectionProps {
  eventId: string;
  eventAdmins: EventAdmin[];
  orgAdmins: OrgAdmin[];
}

export function EventAdminsSection({
  eventId,
  eventAdmins,
  orgAdmins,
}: EventAdminsSectionProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "check_in">("admin");
  const [isPending, startTransition] = useTransition();
  const { confirm, dialog: confirmDialog } = useConfirm();

  const admins = eventAdmins.filter((a) => a.role === "admin");

  function handleAdd() {
    if (!email.trim()) return;
    startTransition(async () => {
      try {
        await addEventAdmin(eventId, email.trim(), "admin");
        toast.success("Admin added");
        setEmail("");
        setShowAdd(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add admin");
      }
    });
  }

  async function handleRemove(admin: EventAdmin) {
    const ok = await confirm({
      title: "Remove Admin",
      description: `Remove ${admin.display_name || admin.email} from this event?`,
      confirmLabel: "Remove",
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await removeEventAdmin(admin.id, eventId);
        toast.success("Admin removed");
      } catch {
        toast.error("Failed to remove admin");
      }
    });
  }

  function handleRoleChange(admin: EventAdmin, newRole: "admin" | "check_in") {
    startTransition(async () => {
      try {
        await updateEventAdminRole(admin.id, eventId, newRole);
        toast.success("Role updated");
      } catch {
        toast.error("Failed to update role");
      }
    });
  }

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Admins</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowAdd(true)}>
              <UserPlus className="mr-1.5 h-4 w-4" />
              Add Admin
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          To have admin privileges for your event, admins must sign up for an
          account using the email addresses provided here. At least one admin
          must receive important admin updates and notifications.
        </p>

        {/* Admin table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 pr-4 font-medium text-muted-foreground" />
                <th className="pb-2 pr-4 font-medium text-muted-foreground">Name</th>
                <th className="pb-2 pr-4 font-medium text-muted-foreground">Email address</th>
                <th className="pb-2 pr-4 font-medium text-muted-foreground">Added by</th>
                <th className="pb-2 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {/* Org-level admins (read-only, shown with crown) */}
              {orgAdmins.map((admin) => (
                <tr key={`org-${admin.id}`} className="text-muted-foreground">
                  <td className="py-3 pr-4">
                    <Crown className="h-4 w-4 text-amber-500" title="Organization admin" />
                  </td>
                  <td className="py-3 pr-4">{admin.display_name}</td>
                  <td className="py-3 pr-4">{admin.email || "—"}</td>
                  <td className="py-3 pr-4 text-xs">Org {admin.role}</td>
                  <td className="py-3 text-xs text-muted-foreground">
                    (org-level)
                  </td>
                </tr>
              ))}
              {/* Per-event admins */}
              {admins.map((admin) => (
                <tr key={admin.id}>
                  <td className="py-3 pr-4">
                    <Shield className="h-4 w-4 text-blue-500" />
                  </td>
                  <td className="py-3 pr-4">
                    {admin.display_name || admin.email.split("@")[0]}
                  </td>
                  <td className="py-3 pr-4">{admin.email}</td>
                  <td className="py-3 pr-4 text-xs">
                    {admin.added_by_name ?? "—"}
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={admin.role}
                        onChange={(e) =>
                          handleRoleChange(admin, e.target.value as "admin" | "check_in")
                        }
                        disabled={isPending}
                        className="rounded border border-border bg-background px-2 py-1 text-xs"
                      >
                        <option value="admin">Admin</option>
                        <option value="check_in">Check-in</option>
                      </select>
                      <button
                        onClick={() => handleRemove(admin)}
                        disabled={isPending}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {orgAdmins.length === 0 && admins.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    No admins added yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Admin Dialog */}
      {showAdd && (
        <ModalOverlay onClose={() => setShowAdd(false)}>
          <Card className="w-full max-w-md p-6">
            <h2 className="mb-4 text-lg font-semibold">Add Admin</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  disabled={isPending}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAdd();
                  }}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => { setShowAdd(false); setEmail(""); }}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button onClick={handleAdd} disabled={isPending || !email.trim()}>
                  {isPending ? "Adding..." : "Add Admin"}
                </Button>
              </div>
            </div>
          </Card>
        </ModalOverlay>
      )}

      {confirmDialog}
    </>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/admin-settings/components/event-admins-section.tsx
git commit -m "feat: add event admins section component"
```

---

### Task 5: Check-in Staff Section Component

**Files:**
- Create: `apps/web/src/features/admin-settings/components/checkin-staff-section.tsx`

**Step 1: Create the component**

```tsx
// apps/web/src/features/admin-settings/components/checkin-staff-section.tsx
"use client";

import { useState, useTransition } from "react";
import {
  Button,
  Input,
  Card,
  ModalOverlay,
  useConfirm,
} from "@attendly/ui/components";
import { ScanLine, UserPlus, Trash2 } from "lucide-react";
import { addEventAdmin, removeEventAdmin } from "../actions";
import type { EventAdmin } from "../queries";
import { toast } from "sonner";

interface CheckinStaffSectionProps {
  eventId: string;
  checkInStaff: EventAdmin[];
}

export function CheckinStaffSection({
  eventId,
  checkInStaff,
}: CheckinStaffSectionProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [email, setEmail] = useState("");
  const [isPending, startTransition] = useTransition();
  const { confirm, dialog: confirmDialog } = useConfirm();

  function handleAdd() {
    if (!email.trim()) return;
    startTransition(async () => {
      try {
        await addEventAdmin(eventId, email.trim(), "check_in");
        toast.success("Check-in staff added");
        setEmail("");
        setShowAdd(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to add staff");
      }
    });
  }

  async function handleRemove(staff: EventAdmin) {
    const ok = await confirm({
      title: "Remove Check-in Staff",
      description: `Remove ${staff.display_name || staff.email} from check-in staff?`,
      confirmLabel: "Remove",
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        await removeEventAdmin(staff.id, eventId);
        toast.success("Staff removed");
      } catch {
        toast.error("Failed to remove staff");
      }
    });
  }

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Check-in Staff</h2>
          </div>
          <Button variant="outline" onClick={() => setShowAdd(true)}>
            <UserPlus className="mr-1.5 h-4 w-4" />
            Add Check-in Staff
          </Button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          People listed here will be able to check people in using the app.
          They will only have permission to view the check-in feature and will
          not be able to access any other admin tools or send announcements.
        </p>

        {checkInStaff.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            No check-in staff added yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 pr-4 font-medium text-muted-foreground">Name</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground">Email</th>
                  <th className="pb-2 pr-4 font-medium text-muted-foreground">Added by</th>
                  <th className="pb-2 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {checkInStaff.map((staff) => (
                  <tr key={staff.id}>
                    <td className="py-3 pr-4">
                      {staff.display_name || staff.email.split("@")[0]}
                    </td>
                    <td className="py-3 pr-4">{staff.email}</td>
                    <td className="py-3 pr-4 text-xs">
                      {staff.added_by_name ?? "—"}
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => handleRemove(staff)}
                        disabled={isPending}
                        className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Check-in Staff Dialog */}
      {showAdd && (
        <ModalOverlay onClose={() => setShowAdd(false)}>
          <Card className="w-full max-w-md p-6">
            <h2 className="mb-4 text-lg font-semibold">Add Check-in Staff</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="staff@example.com"
                  disabled={isPending}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAdd();
                  }}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  This person will only be able to access the check-in feature.
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => { setShowAdd(false); setEmail(""); }}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button onClick={handleAdd} disabled={isPending || !email.trim()}>
                  {isPending ? "Adding..." : "Add Staff"}
                </Button>
              </div>
            </div>
          </Card>
        </ModalOverlay>
      )}

      {confirmDialog}
    </>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/admin-settings/components/checkin-staff-section.tsx
git commit -m "feat: add check-in staff section component"
```

---

### Task 6: Share Templates Section Component

**Files:**
- Create: `apps/web/src/features/admin-settings/components/share-templates-section.tsx`

**Step 1: Create the component**

```tsx
// apps/web/src/features/admin-settings/components/share-templates-section.tsx
"use client";

import { useState, useTransition } from "react";
import {
  Button,
  Input,
  Card,
  Textarea,
  ModalOverlay,
  Badge,
} from "@attendly/ui/components";
import {
  Share2,
  Users,
  User,
  ArrowDownToLine,
  Check,
  X,
} from "lucide-react";
import {
  shareTemplate,
  requestTemplate,
  updateTemplateRequestStatus,
} from "../actions";
import { toast } from "sonner";

interface SharedTemplate {
  id: string;
  shared_with_email: string | null;
  shared_with_org_id: string | null;
  status: string;
  created_at: string;
}

interface TemplateRequest {
  id: string;
  event_name: string;
  requester_name: string;
  message: string | null;
  status: string;
  created_at: string;
}

interface ShareTemplatesSectionProps {
  eventId: string;
  sharedTemplates: SharedTemplate[];
  incomingRequests: TemplateRequest[];
  outgoingRequests: TemplateRequest[];
}

export function ShareTemplatesSection({
  eventId,
  sharedTemplates,
  incomingRequests,
  outgoingRequests,
}: ShareTemplatesSectionProps) {
  const [showShareIndividual, setShowShareIndividual] = useState(false);
  const [showShareOrg, setShowShareOrg] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [orgId, setOrgId] = useState("");
  const [targetEventId, setTargetEventId] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleShareIndividual() {
    if (!shareEmail.trim()) return;
    startTransition(async () => {
      try {
        await shareTemplate(eventId, { email: shareEmail.trim() });
        toast.success("Template shared");
        setShareEmail("");
        setShowShareIndividual(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to share");
      }
    });
  }

  function handleShareOrg() {
    if (!orgId.trim()) return;
    startTransition(async () => {
      try {
        await shareTemplate(eventId, { orgId: orgId.trim() });
        toast.success("Template shared with organization");
        setOrgId("");
        setShowShareOrg(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to share");
      }
    });
  }

  function handleRequest() {
    if (!targetEventId.trim()) return;
    startTransition(async () => {
      try {
        await requestTemplate(eventId, targetEventId.trim(), requestMessage);
        toast.success("Template request sent");
        setTargetEventId("");
        setRequestMessage("");
        setShowRequest(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to send request");
      }
    });
  }

  function handleRequestAction(requestId: string, status: "approved" | "declined") {
    startTransition(async () => {
      try {
        await updateTemplateRequestStatus(requestId, eventId, status);
        toast.success(status === "approved" ? "Request approved" : "Request declined");
      } catch {
        toast.error("Failed to update request");
      }
    });
  }

  const pendingIncoming = incomingRequests.filter((r) => r.status === "pending");

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Share2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Share Event Templates and Settings</h2>
          <Badge variant="info" className="text-xs">NEW</Badge>
        </div>

        {/* Share section */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-2">
            Share event templates and settings with organizers of other events
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            Share your event forms, settings, and templates so others in your
            organization can build on your work instead of starting from scratch.
          </p>
          <div className="flex items-center gap-3">
            <Button onClick={() => setShowShareIndividual(true)}>
              <User className="mr-1.5 h-4 w-4" />
              Share with an individual
            </Button>
            <Button onClick={() => setShowShareOrg(true)}>
              <Users className="mr-1.5 h-4 w-4" />
              Share with an organization
            </Button>
          </div>

          {/* Shared templates list */}
          {sharedTemplates.length > 0 && (
            <div className="mt-4 space-y-2">
              {sharedTemplates.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <span>
                    {st.shared_with_email ?? "Organization"}
                  </span>
                  <Badge
                    variant={
                      st.status === "accepted"
                        ? "success"
                        : st.status === "declined"
                          ? "destructive"
                          : "warning"
                    }
                  >
                    {st.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t pt-6 mb-6">
          <h3 className="text-sm font-semibold mb-2">
            Request event templates and settings from another event
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            Planning a similar event? Ask a past organizer to share their event
            templates and settings. You&apos;ll save time, reduce setup, and
            benefit from what&apos;s proven to work.
          </p>
          <Button variant="outline" onClick={() => setShowRequest(true)}>
            <ArrowDownToLine className="mr-1.5 h-4 w-4" />
            Request templates
          </Button>

          {/* Outgoing requests */}
          {outgoingRequests.length > 0 && (
            <div className="mt-4 space-y-2">
              {outgoingRequests.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                >
                  <span>Requested from: {r.event_name}</span>
                  <Badge
                    variant={
                      r.status === "approved"
                        ? "success"
                        : r.status === "declined"
                          ? "destructive"
                          : "warning"
                    }
                  >
                    {r.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Incoming requests */}
        {pendingIncoming.length > 0 && (
          <div className="border-t pt-6">
            <h3 className="text-sm font-semibold mb-3">
              Incoming Template Requests ({pendingIncoming.length})
            </h3>
            <div className="space-y-3">
              {pendingIncoming.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{r.requester_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Requesting for: {r.event_name}
                      </p>
                      {r.message && (
                        <p className="mt-1 text-sm text-muted-foreground italic">
                          &ldquo;{r.message}&rdquo;
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleRequestAction(r.id, "approved")}
                        disabled={isPending}
                      >
                        <Check className="mr-1 h-3.5 w-3.5" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRequestAction(r.id, "declined")}
                        disabled={isPending}
                      >
                        <X className="mr-1 h-3.5 w-3.5" />
                        Decline
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Share with Individual Dialog */}
      {showShareIndividual && (
        <ModalOverlay onClose={() => setShowShareIndividual(false)}>
          <Card className="w-full max-w-md p-6">
            <h2 className="mb-4 text-lg font-semibold">Share with an Individual</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  placeholder="organizer@example.com"
                  disabled={isPending}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => { setShowShareIndividual(false); setShareEmail(""); }}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button onClick={handleShareIndividual} disabled={isPending || !shareEmail.trim()}>
                  {isPending ? "Sharing..." : "Share"}
                </Button>
              </div>
            </div>
          </Card>
        </ModalOverlay>
      )}

      {/* Share with Organization Dialog */}
      {showShareOrg && (
        <ModalOverlay onClose={() => setShowShareOrg(false)}>
          <Card className="w-full max-w-md p-6">
            <h2 className="mb-4 text-lg font-semibold">Share with an Organization</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Organization ID
                </label>
                <Input
                  value={orgId}
                  onChange={(e) => setOrgId(e.target.value)}
                  placeholder="Organization ID or name"
                  disabled={isPending}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  All admins of this organization will be able to clone your templates.
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => { setShowShareOrg(false); setOrgId(""); }}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button onClick={handleShareOrg} disabled={isPending || !orgId.trim()}>
                  {isPending ? "Sharing..." : "Share"}
                </Button>
              </div>
            </div>
          </Card>
        </ModalOverlay>
      )}

      {/* Request Templates Dialog */}
      {showRequest && (
        <ModalOverlay onClose={() => setShowRequest(false)}>
          <Card className="w-full max-w-md p-6">
            <h2 className="mb-4 text-lg font-semibold">Request Templates</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Event ID to request from
                </label>
                <Input
                  value={targetEventId}
                  onChange={(e) => setTargetEventId(e.target.value)}
                  placeholder="Event ID"
                  disabled={isPending}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Message (optional)
                </label>
                <Textarea
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="Hi, I'm planning a similar event and would love to use your templates..."
                  rows={3}
                  disabled={isPending}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRequest(false);
                    setTargetEventId("");
                    setRequestMessage("");
                  }}
                  disabled={isPending}
                >
                  Cancel
                </Button>
                <Button onClick={handleRequest} disabled={isPending || !targetEventId.trim()}>
                  {isPending ? "Sending..." : "Send Request"}
                </Button>
              </div>
            </div>
          </Card>
        </ModalOverlay>
      )}
    </>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/features/admin-settings/components/share-templates-section.tsx
git commit -m "feat: add share templates section component"
```

---

### Task 7: Admin Settings Page & Sidebar Integration

**Files:**
- Create: `apps/web/src/app/(organizer)/events/[eventId]/admin-settings/page.tsx`
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/layout.tsx:100` (add sidebar item)

**Step 1: Create the page**

```tsx
// apps/web/src/app/(organizer)/events/[eventId]/admin-settings/page.tsx
import {
  getInvitationCode,
  getEventAdmins,
  getOrgAdminsForEvent,
  getSharedTemplates,
  getTemplateRequests,
} from "@/features/admin-settings/queries";
import { InvitationCodeSection } from "@/features/admin-settings/components/invitation-code-section";
import { EventAdminsSection } from "@/features/admin-settings/components/event-admins-section";
import { CheckinStaffSection } from "@/features/admin-settings/components/checkin-staff-section";
import { ShareTemplatesSection } from "@/features/admin-settings/components/share-templates-section";

export default async function AdminSettingsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const [invCode, eventAdmins, orgAdmins, sharedTemplates, templateRequests] =
    await Promise.all([
      getInvitationCode(eventId),
      getEventAdmins(eventId),
      getOrgAdminsForEvent(eventId),
      getSharedTemplates(eventId),
      getTemplateRequests(eventId),
    ]);

  const checkInStaff = eventAdmins.filter((a) => a.role === "check_in");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage event access, invitation codes, and template sharing.
        </p>
      </div>

      <InvitationCodeSection
        eventId={eventId}
        initialCode={invCode.code}
        initialRequired={invCode.required}
      />

      <EventAdminsSection
        eventId={eventId}
        eventAdmins={eventAdmins}
        orgAdmins={orgAdmins}
      />

      <CheckinStaffSection eventId={eventId} checkInStaff={checkInStaff} />

      <ShareTemplatesSection
        eventId={eventId}
        sharedTemplates={sharedTemplates}
        incomingRequests={templateRequests.incoming}
        outgoingRequests={templateRequests.outgoing}
      />
    </div>
  );
}
```

**Step 2: Add sidebar item in layout.tsx**

In `apps/web/src/app/(organizer)/events/[eventId]/layout.tsx`, find the Attendees group (around line 85-101). After the Badges item (line 100), add:

```typescript
        { href: `/events/${eventId}/admin-settings`, label: "Admin Settings", icon: "shield" },
```

The Attendees group should now look like:

```typescript
    {
      label: "Attendees",
      icon: "users" as const,
      firstHref: `/events/${eventId}/registrations`,
      items: [
        {
          href: `/events/${eventId}/registrations`,
          label: "Manage Attendees",
          icon: "users",
          children: [
            { href: `/events/${eventId}/registrations`, label: "Attendees" },
            { href: `/events/${eventId}/attendee-limit`, label: "Attendee Limit Upgrade" },
            { href: `/events/${eventId}/attendee-categories`, label: "Attendee Categories" },
          ],
        },
        { href: `/events/${eventId}/check-in`, label: "Check-in", icon: "qr-code" },
        { href: `/events/${eventId}/badges`, label: "Badges", icon: "id-card" },
        { href: `/events/${eventId}/admin-settings`, label: "Admin Settings", icon: "shield" },
      ],
    },
```

**Step 3: Verify the icon exists**

Check that `"shield"` is a valid icon in the `EventSubSidebar` component's icon mapping. If not, use `"settings"` or add the mapping.

**Step 4: Commit**

```bash
git add apps/web/src/app/(organizer)/events/[eventId]/admin-settings/page.tsx apps/web/src/app/(organizer)/events/[eventId]/layout.tsx
git commit -m "feat: add admin settings page and sidebar link under Attendees"
```

---

### Task 8: Verify End-to-End

**Step 1: Start the dev server**

Run: `cd apps/web && pnpm dev`

**Step 2: Navigate to admin settings**

Open `http://localhost:3000/events/{eventId}/admin-settings` in the browser.

Expected:
- Page loads with 4 sections: Invitation Code, Admins, Check-in Staff, Share Templates
- Sidebar shows "Admin Settings" under Attendees group

**Step 3: Test invitation code**

- Enter a code, click "Set Code" → toast success
- Toggle checkbox → toast success
- Refresh page → code persists

**Step 4: Test adding an admin**

- Click "Add Admin" → dialog opens
- Enter email, submit → admin appears in table
- Change role dropdown → toast success
- Click trash icon → confirm dialog → admin removed

**Step 5: Test adding check-in staff**

- Click "Add Check-in Staff" → dialog opens
- Enter email, submit → staff appears in table
- Click trash icon → confirm dialog → staff removed

**Step 6: Test template sharing**

- Click "Share with an individual" → dialog, enter email, submit → appears in list
- Click "Request templates" → dialog, enter event ID + message, submit → appears in outgoing list

**Step 7: Commit final verification**

```bash
git commit --allow-empty -m "chore: verify admin settings feature end-to-end"
```

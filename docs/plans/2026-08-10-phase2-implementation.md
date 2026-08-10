# Phase 2: Attendee Management — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add name badges (PDF), kiosk check-in, attendee segments, and criteria-based certificates to Attendly.

**Architecture:** Four features built on existing registration/check-in infrastructure. Only certificates need new database tables (`certificate_configs`, `certificates_issued`). Badges, kiosk, and segments use existing tables with no schema changes. All PDF generation is client-side via jsPDF.

**Tech Stack:** Next.js 16, React 19, Supabase (PostgreSQL + RLS), Tailwind CSS 4, jsPDF, qrcode

---

## Task 1: Database Migration for Certificates

**Files:**
- Create: `packages/supabase/migrations/032_certificates.sql`

**Step 1: Write the migration**

```sql
-- ============================================================
-- Phase 2: Certificate Configuration & Issuance
-- ============================================================

CREATE TABLE public.certificate_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Certificate of Attendance',
  min_check_ins INT NOT NULL DEFAULT 1,
  required_session_ids UUID[] NOT NULL DEFAULT '{}',
  custom_fields JSONB NOT NULL DEFAULT '{}',
  template_style TEXT NOT NULL DEFAULT 'classic',
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id)
);

CREATE TABLE public.certificates_issued (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES public.certificate_configs(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  emailed_at TIMESTAMPTZ,
  UNIQUE(config_id, registration_id)
);

-- RLS
ALTER TABLE public.certificate_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates_issued ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificate_configs TO authenticated;
GRANT SELECT, INSERT ON public.certificates_issued TO authenticated;
GRANT SELECT ON public.certificate_configs TO anon;
GRANT SELECT ON public.certificates_issued TO anon;

-- Org editors can manage certificate configs
CREATE POLICY "Org members can manage certificate configs" ON public.certificate_configs FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e WHERE e.id = certificate_configs.event_id
    AND is_org_member(e.organization_id, 'editor')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM events e WHERE e.id = certificate_configs.event_id
    AND is_org_member(e.organization_id, 'editor')
  ));

-- Anyone can view enabled configs (for public download page)
CREATE POLICY "Anyone can view enabled certificate configs" ON public.certificate_configs FOR SELECT
  USING (enabled AND EXISTS (
    SELECT 1 FROM events e WHERE e.id = certificate_configs.event_id
    AND e.status IN ('published', 'completed')
  ));

-- Org members can view all issued certificates
CREATE POLICY "Org members can view issued certificates" ON public.certificates_issued FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM certificate_configs cc
    JOIN events e ON e.id = cc.event_id
    WHERE cc.id = certificates_issued.config_id
    AND is_org_member(e.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM certificate_configs cc
    JOIN events e ON e.id = cc.event_id
    WHERE cc.id = certificates_issued.config_id
    AND is_org_member(e.organization_id, 'editor')
  ));

-- Attendees can view their own certificates (by matching registration)
CREATE POLICY "Attendees can view own certificates" ON public.certificates_issued FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM registrations r
    WHERE r.id = certificates_issued.registration_id
    AND r.user_id = auth.uid()
  ));

-- Indexes
CREATE INDEX idx_certificate_configs_event ON public.certificate_configs(event_id);
CREATE INDEX idx_certificates_issued_config ON public.certificates_issued(config_id);
CREATE INDEX idx_certificates_issued_registration ON public.certificates_issued(registration_id);
```

**Step 2: Apply the migration**

Run: `npx supabase migration up --workdir packages/supabase`
Expected: Migration applied successfully.

**Step 3: Commit**

```bash
git add packages/supabase/migrations/032_certificates.sql
git commit -m "feat: add certificate_configs and certificates_issued tables"
```

---

## Task 2: Attendee Segments — Extend Queries & Segment Filter Component

**Files:**
- Modify: `apps/web/src/features/emails/lib/segments.ts`
- Create: `apps/web/src/features/registration/components/segment-filter.tsx`
- Modify: `apps/web/src/features/registration/queries.ts`

**Step 1: Extend `getSegmentedRecipients` with custom field filters**

In `apps/web/src/features/emails/lib/segments.ts`, update the `SegmentFilters` type and query:

```typescript
import { createClient } from "@attendly/ui/supabase/server";

type SegmentFilters = {
  ticket_type_ids?: string[];
  statuses?: string[];
  checked_in?: boolean;
  custom_field_filters?: { field_id: string; value: string }[];
  min_check_ins?: number;
};

export async function getSegmentedRecipients(
  eventId: string,
  filters?: SegmentFilters
) {
  const supabase = await createClient();

  let query = supabase
    .from("registrations")
    .select("id, name, email, status, ticket_type_id, custom_fields, ticket_types(name)")
    .eq("event_id", eventId)
    .eq("unsubscribed", false);

  if (filters?.ticket_type_ids && filters.ticket_type_ids.length > 0) {
    query = query.in("ticket_type_id", filters.ticket_type_ids);
  }

  if (filters?.statuses && filters.statuses.length > 0) {
    query = query.in("status", filters.statuses);
  } else {
    query = query.in("status", ["confirmed", "checked_in"]);
  }

  if (filters?.checked_in === true) {
    query = query.eq("status", "checked_in");
  } else if (filters?.checked_in === false) {
    query = query.neq("status", "checked_in");
  }

  const { data, error } = await query.order("name");
  if (error) throw new Error(error.message);

  let results = data;

  // Client-side filter for custom field values (JSONB filtering)
  if (filters?.custom_field_filters && filters.custom_field_filters.length > 0) {
    results = results.filter((r) => {
      const cf = (r.custom_fields ?? {}) as Record<string, unknown>;
      return filters.custom_field_filters!.every(
        (f) => String(cf[f.field_id] ?? "") === f.value
      );
    });
  }

  // Client-side filter for min check-ins (requires separate query)
  if (filters?.min_check_ins && filters.min_check_ins > 0) {
    const { data: checkIns } = await supabase
      .from("check_ins")
      .select("registration_id")
      .eq("event_id", eventId);

    const countByReg: Record<string, number> = {};
    for (const ci of checkIns ?? []) {
      countByReg[ci.registration_id] = (countByReg[ci.registration_id] ?? 0) + 1;
    }

    results = results.filter(
      (r) => (countByReg[r.id] ?? 0) >= filters.min_check_ins!
    );
  }

  return results;
}
```

**Step 2: Add `getFilteredRegistrations` to queries**

In `apps/web/src/features/registration/queries.ts`, add at the bottom:

```typescript
export async function getCustomFieldDefinitions(eventId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("custom_registration_fields")
    .select("id, label, field_type, options")
    .eq("event_id", eventId)
    .order("sort_order");
  return data ?? [];
}
```

**Step 3: Create the segment filter component**

Create `apps/web/src/features/registration/components/segment-filter.tsx`:

```tsx
"use client";

import { useState } from "react";

type TicketType = { id: string; name: string };
type CustomField = { id: string; label: string; field_type: string; options: string[] | null };

export type SegmentCriteria = {
  ticket_type_ids: string[];
  statuses: string[];
  custom_field_filters: { field_id: string; value: string }[];
  min_check_ins: number;
};

const STATUS_OPTIONS = [
  { value: "confirmed", label: "Confirmed" },
  { value: "checked_in", label: "Checked In" },
  { value: "pending", label: "Pending" },
  { value: "cancelled", label: "Cancelled" },
];

export function SegmentFilter({
  ticketTypes,
  customFields,
  onChange,
  matchCount,
}: {
  ticketTypes: TicketType[];
  customFields: CustomField[];
  onChange: (criteria: SegmentCriteria) => void;
  matchCount?: number;
}) {
  const [criteria, setCriteria] = useState<SegmentCriteria>({
    ticket_type_ids: [],
    statuses: [],
    custom_field_filters: [],
    min_check_ins: 0,
  });

  function update(partial: Partial<SegmentCriteria>) {
    const next = { ...criteria, ...partial };
    setCriteria(next);
    onChange(next);
  }

  function toggleArrayItem(arr: string[], item: string) {
    return arr.includes(item) ? arr.filter((v) => v !== item) : [...arr, item];
  }

  function setCustomFieldFilter(fieldId: string, value: string) {
    const existing = criteria.custom_field_filters.filter((f) => f.field_id !== fieldId);
    if (value) existing.push({ field_id: fieldId, value });
    update({ custom_field_filters: existing });
  }

  return (
    <div className="rounded-xl border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Filter Attendees</h3>
        {matchCount !== undefined && (
          <span className="text-xs text-muted-foreground">
            {matchCount} matching
          </span>
        )}
      </div>

      {/* Ticket types */}
      {ticketTypes.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Ticket Type</span>
          <div className="flex flex-wrap gap-2">
            {ticketTypes.map((tt) => (
              <button
                key={tt.id}
                onClick={() => update({ ticket_type_ids: toggleArrayItem(criteria.ticket_type_ids, tt.id) })}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  criteria.ticket_type_ids.includes(tt.id)
                    ? "bg-foreground text-background border-foreground"
                    : "bg-transparent text-foreground border-border hover:bg-muted"
                }`}
              >
                {tt.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Statuses */}
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Status</span>
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.value}
              onClick={() => update({ statuses: toggleArrayItem(criteria.statuses, s.value) })}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                criteria.statuses.includes(s.value)
                  ? "bg-foreground text-background border-foreground"
                  : "bg-transparent text-foreground border-border hover:bg-muted"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Min check-ins */}
      <div className="space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">Min Sessions Attended</span>
        <input
          type="number"
          min={0}
          value={criteria.min_check_ins}
          onChange={(e) => update({ min_check_ins: parseInt(e.target.value) || 0 })}
          className="w-24 rounded-lg border bg-transparent px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Custom fields (dropdown/radio type only) */}
      {customFields
        .filter((cf) => cf.options && cf.options.length > 0)
        .map((cf) => (
          <div key={cf.id} className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">{cf.label}</span>
            <select
              value={criteria.custom_field_filters.find((f) => f.field_id === cf.id)?.value ?? ""}
              onChange={(e) => setCustomFieldFilter(cf.id, e.target.value)}
              className="w-full rounded-lg border bg-transparent px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All</option>
              {(cf.options ?? []).map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        ))}

      {/* Clear button */}
      <button
        onClick={() => update({ ticket_type_ids: [], statuses: [], custom_field_filters: [], min_check_ins: 0 })}
        className="text-xs text-muted-foreground hover:text-foreground underline"
      >
        Clear all filters
      </button>
    </div>
  );
}
```

**Step 4: Verify build**

Run: `cd apps/web && npx next build --no-lint 2>&1 | tail -5`
Expected: Build succeeds (component is not yet wired into a page, but should compile).

**Step 5: Commit**

```bash
git add apps/web/src/features/emails/lib/segments.ts \
  apps/web/src/features/registration/components/segment-filter.tsx \
  apps/web/src/features/registration/queries.ts
git commit -m "feat: add attendee segment filtering — extended queries + filter component"
```

---

## Task 3: Name Badges — PDF Generation

**Files:**
- Create: `apps/web/src/features/badges/generate-badges.ts`

**Step 1: Install qrcode dependency**

Run: `cd apps/web && pnpm add qrcode @types/qrcode`

**Step 2: Create the badge PDF generator**

Create `apps/web/src/features/badges/generate-badges.ts`:

```typescript
import { jsPDF } from "jspdf";
import QRCode from "qrcode";

type BadgeInput = {
  name: string;
  email: string;
  company?: string;
  jobTitle?: string;
  ticketType: string;
  qrCode: string;
  labels?: string[]; // segment labels like "VEG", "SPEAKER"
};

type BadgeConfig = {
  showCompany: boolean;
  showJobTitle: boolean;
  showLabels: boolean;
  colorByTicketType: boolean;
};

// Ticket-type color palette
const TICKET_COLORS: Record<string, [number, number, number]> = {};
const COLOR_PALETTE: [number, number, number][] = [
  [45, 55, 72],    // slate
  [139, 92, 246],  // purple
  [14, 165, 233],  // sky
  [234, 88, 12],   // orange
  [22, 163, 74],   // green
  [225, 29, 72],   // rose
];

function getTicketColor(ticketType: string): [number, number, number] {
  if (!TICKET_COLORS[ticketType]) {
    const idx = Object.keys(TICKET_COLORS).length % COLOR_PALETTE.length;
    TICKET_COLORS[ticketType] = COLOR_PALETTE[idx];
  }
  return TICKET_COLORS[ticketType];
}

export async function generateBadgesPdf(
  attendees: BadgeInput[],
  eventTitle: string,
  config: BadgeConfig
): Promise<Uint8Array> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth(); // 297
  const pageHeight = doc.internal.pageSize.getHeight(); // 210

  // 2x2 grid: 4 badges per page
  const badgeW = 130;
  const badgeH = 90;
  const marginX = (pageWidth - badgeW * 2) / 3;
  const marginY = (pageHeight - badgeH * 2) / 3;

  const positions = [
    { x: marginX, y: marginY },
    { x: marginX + badgeW + marginX, y: marginY },
    { x: marginX, y: marginY + badgeH + marginY },
    { x: marginX + badgeW + marginX, y: marginY + badgeH + marginY },
  ];

  for (let i = 0; i < attendees.length; i++) {
    if (i > 0 && i % 4 === 0) doc.addPage();

    const pos = positions[i % 4];
    const a = attendees[i];
    const color = config.colorByTicketType ? getTicketColor(a.ticketType) : [45, 55, 72] as [number, number, number];

    // Badge border
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.rect(pos.x, pos.y, badgeW, badgeH);

    // Color bar at top
    doc.setFillColor(...color);
    doc.rect(pos.x, pos.y, badgeW, 5, "F");

    // QR code (left side)
    const qrSize = 28;
    const qrX = pos.x + 6;
    const qrY = pos.y + 12;

    try {
      const qrDataUrl = await QRCode.toDataURL(a.qrCode, {
        width: 200,
        margin: 0,
        errorCorrectionLevel: "M",
      });
      doc.addImage(qrDataUrl, "PNG", qrX, qrY, qrSize, qrSize);
    } catch {
      // Fallback: draw a placeholder box
      doc.setDrawColor(200, 200, 200);
      doc.rect(qrX, qrY, qrSize, qrSize);
      doc.setFontSize(6);
      doc.text("QR", qrX + qrSize / 2, qrY + qrSize / 2, { align: "center" });
    }

    // Text (right side)
    const textX = pos.x + 40;
    let textY = pos.y + 16;

    // Name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    const nameLines = doc.splitTextToSize(a.name, badgeW - 46);
    doc.text(nameLines, textX, textY);
    textY += nameLines.length * 6 + 2;

    // Company
    if (config.showCompany && a.company) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(a.company, textX, textY);
      textY += 5;
    }

    // Job title
    if (config.showJobTitle && a.jobTitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(130, 130, 130);
      doc.text(a.jobTitle, textX, textY);
      textY += 5;
    }

    // Divider
    doc.setDrawColor(220, 220, 220);
    doc.line(textX, textY, pos.x + badgeW - 6, textY);
    textY += 4;

    // Ticket type
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...color);
    doc.text(a.ticketType.toUpperCase(), textX, textY);
    textY += 5;

    // Labels
    if (config.showLabels && a.labels && a.labels.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      let labelX = textX;
      for (const label of a.labels) {
        const labelW = doc.getTextWidth(label) + 4;
        doc.setFillColor(240, 240, 240);
        doc.roundedRect(labelX, textY - 3, labelW, 5, 1, 1, "F");
        doc.setTextColor(80, 80, 80);
        doc.text(label, labelX + 2, textY);
        labelX += labelW + 2;
      }
    }

    // Event title at bottom
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.setTextColor(160, 160, 160);
    doc.text(eventTitle, pos.x + badgeW / 2, pos.y + badgeH - 4, { align: "center" });
  }

  return new Uint8Array(doc.output("arraybuffer"));
}
```

**Step 3: Commit**

```bash
git add apps/web/src/features/badges/generate-badges.ts
git commit -m "feat: add name badge PDF generator with QR codes and segment labels"
```

---

## Task 4: Name Badges — Organizer UI

**Files:**
- Create: `apps/web/src/features/badges/components/badge-configurator.tsx`
- Create: `apps/web/src/app/(organizer)/events/[eventId]/badges/page.tsx`
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/layout.tsx`

**Step 1: Create the badge configurator component**

Create `apps/web/src/features/badges/components/badge-configurator.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";
import { generateBadgesPdf } from "../generate-badges";
import { SegmentFilter, type SegmentCriteria } from "@/features/registration/components/segment-filter";

type Registration = {
  id: string;
  name: string;
  email: string;
  status: string;
  qr_code: string;
  custom_fields: Record<string, unknown>;
  ticket_type_id: string;
  user_id: string | null;
  ticket_types: { name: string } | { name: string }[];
  profile?: { company: string | null; job_title: string | null } | null;
};

type TicketType = { id: string; name: string };
type CustomField = { id: string; label: string; field_type: string; options: string[] | null };

export function BadgeConfigurator({
  registrations,
  ticketTypes,
  customFields,
  eventTitle,
}: {
  registrations: Registration[];
  ticketTypes: TicketType[];
  customFields: CustomField[];
  eventTitle: string;
}) {
  const [showCompany, setShowCompany] = useState(true);
  const [showJobTitle, setShowJobTitle] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [colorByTicket, setColorByTicket] = useState(true);
  const [labelFields, setLabelFields] = useState<string[]>([]);
  const [criteria, setCriteria] = useState<SegmentCriteria>({
    ticket_type_ids: [],
    statuses: [],
    custom_field_filters: [],
    min_check_ins: 0,
  });
  const [isPending, startTransition] = useTransition();

  // Apply segment filters client-side
  const filtered = registrations.filter((r) => {
    if (criteria.ticket_type_ids.length > 0 && !criteria.ticket_type_ids.includes(r.ticket_type_id)) return false;
    if (criteria.statuses.length > 0 && !criteria.statuses.includes(r.status)) return false;
    if (criteria.custom_field_filters.length > 0) {
      const cf = (r.custom_fields ?? {}) as Record<string, unknown>;
      for (const f of criteria.custom_field_filters) {
        if (String(cf[f.field_id] ?? "") !== f.value) return false;
      }
    }
    return true;
  }).filter((r) => ["confirmed", "checked_in"].includes(r.status));

  function getTicketName(r: Registration): string {
    const tt = r.ticket_types;
    if (Array.isArray(tt)) return tt[0]?.name ?? "General";
    return tt?.name ?? "General";
  }

  function getLabels(r: Registration): string[] {
    if (!showLabels || labelFields.length === 0) return [];
    const cf = (r.custom_fields ?? {}) as Record<string, unknown>;
    return labelFields
      .map((fid) => {
        const val = cf[fid];
        return val ? String(val).substring(0, 10).toUpperCase() : "";
      })
      .filter(Boolean);
  }

  async function handleGenerate() {
    if (filtered.length === 0) return;

    startTransition(async () => {
      const badgeInputs = filtered.map((r) => ({
        name: r.name,
        email: r.email,
        company: r.profile?.company ?? undefined,
        jobTitle: r.profile?.job_title ?? undefined,
        ticketType: getTicketName(r),
        qrCode: r.qr_code,
        labels: getLabels(r),
      }));

      const pdf = await generateBadgesPdf(badgeInputs, eventTitle, {
        showCompany,
        showJobTitle,
        showLabels,
        colorByTicketType: colorByTicket,
      });

      const blob = new Blob([pdf], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `badges-${eventTitle.toLowerCase().replace(/\s+/g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-6">
        {/* Badge options */}
        <div className="rounded-xl border p-6 space-y-4">
          <h3 className="text-lg font-semibold">Badge Layout</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showCompany} onChange={(e) => setShowCompany(e.target.checked)} className="accent-foreground" />
              Show company name
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showJobTitle} onChange={(e) => setShowJobTitle(e.target.checked)} className="accent-foreground" />
              Show job title
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={colorByTicket} onChange={(e) => setColorByTicket(e.target.checked)} className="accent-foreground" />
              Color-code by ticket type
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showLabels} onChange={(e) => setShowLabels(e.target.checked)} className="accent-foreground" />
              Show segment labels on badge
            </label>
          </div>

          {/* Label field selection */}
          {showLabels && customFields.filter((cf) => cf.options && cf.options.length > 0).length > 0 && (
            <div className="space-y-1.5 pl-6">
              <span className="text-xs font-medium text-muted-foreground">Label fields (shown as abbreviations)</span>
              {customFields
                .filter((cf) => cf.options && cf.options.length > 0)
                .map((cf) => (
                  <label key={cf.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={labelFields.includes(cf.id)}
                      onChange={(e) =>
                        setLabelFields((prev) =>
                          e.target.checked ? [...prev, cf.id] : prev.filter((id) => id !== cf.id)
                        )
                      }
                      className="accent-foreground"
                    />
                    {cf.label}
                  </label>
                ))}
            </div>
          )}
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={isPending || filtered.length === 0}
          className="flex items-center gap-2 rounded-lg bg-foreground text-background px-6 py-3 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {isPending ? "Generating..." : `Generate ${filtered.length} Badge${filtered.length !== 1 ? "s" : ""} (PDF)`}
        </button>
      </div>

      {/* Sidebar: segment filter */}
      <SegmentFilter
        ticketTypes={ticketTypes}
        customFields={customFields}
        onChange={setCriteria}
        matchCount={filtered.length}
      />
    </div>
  );
}
```

**Step 2: Create the badges page**

Create `apps/web/src/app/(organizer)/events/[eventId]/badges/page.tsx`:

```tsx
import { createClient } from "@attendly/ui/supabase/server";
import { BadgeConfigurator } from "@/features/badges/components/badge-configurator";
import { getCustomFieldDefinitions } from "@/features/registration/queries";

export default async function BadgesPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("title")
    .eq("id", eventId)
    .single();

  const { data: registrations } = await supabase
    .from("registrations")
    .select("id, name, email, status, qr_code, custom_fields, ticket_type_id, user_id, ticket_types(name)")
    .eq("event_id", eventId)
    .in("status", ["confirmed", "checked_in"])
    .order("name");

  // Fetch profiles for company/job title
  const userIds = (registrations ?? [])
    .map((r) => r.user_id)
    .filter((id): id is string => id !== null);

  let profiles: Record<string, { company: string | null; job_title: string | null }> = {};
  if (userIds.length > 0) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, company, job_title")
      .in("id", userIds);

    for (const p of profileData ?? []) {
      profiles[p.id] = { company: p.company, job_title: p.job_title };
    }
  }

  const enriched = (registrations ?? []).map((r) => ({
    ...r,
    profile: r.user_id ? profiles[r.user_id] ?? null : null,
  }));

  const { data: ticketTypes } = await supabase
    .from("ticket_types")
    .select("id, name")
    .eq("event_id", eventId)
    .order("sort_order");

  const customFields = await getCustomFieldDefinitions(eventId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Name Badges</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate printable PDF badges with QR codes for attendee check-in.
        </p>
      </div>
      <BadgeConfigurator
        registrations={enriched}
        ticketTypes={ticketTypes ?? []}
        customFields={customFields}
        eventTitle={event?.title ?? "Event"}
      />
    </div>
  );
}
```

**Step 3: Add "Badges" tab to organizer layout**

In `apps/web/src/app/(organizer)/events/[eventId]/layout.tsx`, add the `IdCard` icon import and a new tab entry after Check-in:

Add to imports (line 2):
```typescript
import { ArrowLeft, Calendar, Users, QrCode, BarChart2, BarChart3, Settings, Ticket, DoorOpen, Mail, ListChecks, Tag, ClipboardList, Megaphone, MessageSquare, CalendarCheck, IdCard, Award } from "lucide-react";
```

Add to tabs array (after the check-in entry at line 33):
```typescript
    { href: `/events/${eventId}/badges`, label: "Badges", icon: IdCard },
```

Add after the survey entry (line 40):
```typescript
    { href: `/events/${eventId}/certificates`, label: "Certificates", icon: Award },
```

**Step 4: Verify build**

Run: `cd apps/web && npx next build --no-lint 2>&1 | tail -5`
Expected: Build succeeds.

**Step 5: Commit**

```bash
git add apps/web/src/features/badges/components/badge-configurator.tsx \
  apps/web/src/app/\(organizer\)/events/\[eventId\]/badges/page.tsx \
  apps/web/src/app/\(organizer\)/events/\[eventId\]/layout.tsx
git commit -m "feat: add name badge configurator and organizer page"
```

---

## Task 5: Kiosk Check-in — Action + UI

**Files:**
- Modify: `apps/web/src/features/registration/actions.ts`
- Create: `apps/web/src/features/registration/components/kiosk-mode.tsx`
- Create: `apps/web/src/app/(organizer)/events/[eventId]/check-in/kiosk/page.tsx`
- Modify: `apps/web/src/app/(organizer)/events/[eventId]/check-in/page.tsx`

**Step 1: Add `checkInByRegistrationId` action**

In `apps/web/src/features/registration/actions.ts`, add after the `checkInByQrCode` function:

```typescript
export async function checkInByRegistrationId(registrationId: string, eventId: string, sessionId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { data: registration, error: findError } = await supabase
    .from("registrations")
    .select("id, name, email, status, qr_code, event_id, ticket_type_id, ticket_types(name)")
    .eq("id", registrationId)
    .eq("event_id", eventId)
    .single();

  if (findError || !registration) throw new Error("Registration not found");
  if (registration.status === "cancelled") throw new Error("This registration has been cancelled");

  const { error: checkInError } = await supabase
    .from("check_ins")
    .insert({
      registration_id: registration.id,
      event_id: eventId,
      session_id: sessionId,
      checked_in_by: user.id,
    });

  if (checkInError) {
    if (checkInError.code === "23505") {
      return { ...registration, already_checked_in: true };
    }
    throw new Error(checkInError.message);
  }

  if (registration.status !== "checked_in") {
    await supabase
      .from("registrations")
      .update({
        status: "checked_in",
        checked_in_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", registration.id);
  }

  revalidatePath(`/events/${eventId}/registrations`);
  revalidatePath(`/events/${eventId}/check-in`);

  return { ...registration, status: "checked_in", checked_in_at: new Date().toISOString(), already_checked_in: false };
}

export async function searchRegistrations(eventId: string, query: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { data, error } = await supabase
    .from("registrations")
    .select("id, name, email, status, ticket_type_id, ticket_types(name)")
    .eq("event_id", eventId)
    .in("status", ["confirmed", "checked_in"])
    .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
    .order("name")
    .limit(10);

  if (error) throw new Error(error.message);
  return data;
}
```

**Step 2: Create the kiosk mode component**

Create `apps/web/src/features/registration/components/kiosk-mode.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle, AlertCircle, XCircle, Search, QrCode, ArrowLeft } from "lucide-react";
import { checkInByQrCode, checkInByRegistrationId, searchRegistrations } from "../actions";

type CheckInSession = { id: string; title: string; start_time: string };
type SearchResult = { id: string; name: string; email: string; status: string; ticket_types: { name: string } | { name: string }[] };

type KioskState =
  | { mode: "idle" }
  | { mode: "scanning" }
  | { mode: "searching" }
  | { mode: "success"; name: string; ticketType: string; alreadyCheckedIn: boolean }
  | { mode: "error"; message: string };

function getTicketName(tt: { name: string } | { name: string }[] | null): string {
  if (!tt) return "General";
  if (Array.isArray(tt)) return tt[0]?.name ?? "General";
  return tt.name ?? "General";
}

export function KioskMode({
  eventId,
  eventTitle,
  sessions,
}: {
  eventId: string;
  eventTitle: string;
  sessions: CheckInSession[];
}) {
  const [sessionId, setSessionId] = useState(sessions[0]?.id ?? "");
  const [state, setState] = useState<KioskState>({ mode: "idle" });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const scannerRef = useRef<any>(null);
  const processingRef = useRef(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout>>();

  function resetToIdle() {
    setState({ mode: "idle" });
    setSearchQuery("");
    setSearchResults([]);
  }

  function scheduleReset() {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(resetToIdle, 4000);
  }

  async function handleCheckInResult(result: { name: string; already_checked_in: boolean; ticket_types: any }) {
    setState({
      mode: "success",
      name: result.name,
      ticketType: getTicketName(result.ticket_types),
      alreadyCheckedIn: result.already_checked_in,
    });
    scheduleReset();
  }

  async function handleQrScan(decodedText: string) {
    if (processingRef.current || !sessionId) return;
    processingRef.current = true;

    try {
      const result = await checkInByQrCode(decodedText, eventId, sessionId);
      await handleCheckInResult(result);
    } catch (err) {
      setState({ mode: "error", message: err instanceof Error ? err.message : "Check-in failed" });
      scheduleReset();
    }

    setTimeout(() => { processingRef.current = false; }, 2000);
  }

  async function startScanner() {
    setState({ mode: "scanning" });
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    const { Html5Qrcode } = await import("html5-qrcode");
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
    }

    const scanner = new Html5Qrcode("kiosk-qr-reader");
    scannerRef.current = scanner;

    try {
      try {
        await scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 300, height: 300 } }, handleQrScan, () => {});
      } catch {
        await scanner.start({ facingMode: "user" }, { fps: 10, qrbox: { width: 300, height: 300 } }, handleQrScan, () => {});
      }
    } catch {
      setState({ mode: "error", message: "Could not access camera" });
      scheduleReset();
    }
  }

  async function handleSearch(query: string) {
    setSearchQuery(query);
    if (query.length < 2) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const results = await searchRegistrations(eventId, query);
      setSearchResults(results);
    } catch { setSearchResults([]); }
    setSearchLoading(false);
  }

  async function handleSelectAttendee(regId: string) {
    if (!sessionId) return;
    try {
      const result = await checkInByRegistrationId(regId, eventId, sessionId);
      await handleCheckInResult(result);
    } catch (err) {
      setState({ mode: "error", message: err instanceof Error ? err.message : "Check-in failed" });
      scheduleReset();
    }
  }

  useEffect(() => {
    return () => {
      if (scannerRef.current) { try { scannerRef.current.stop(); } catch {} }
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (state.mode === "idle" && sessionId) startScanner();
  }, [state.mode, sessionId]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-xl font-bold">{eventTitle}</h1>
          <p className="text-sm text-muted-foreground">Self-Service Check-in</p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
          <a
            href={`/events/${eventId}/check-in`}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" /> Exit Kiosk
          </a>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 items-center justify-center p-8">
        {/* Success */}
        {state.mode === "success" && (
          <div className="text-center space-y-4 animate-in fade-in duration-300">
            <div className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full ${state.alreadyCheckedIn ? "bg-amber-100" : "bg-emerald-100"}`}>
              {state.alreadyCheckedIn ? (
                <AlertCircle className="h-12 w-12 text-amber-600" />
              ) : (
                <CheckCircle className="h-12 w-12 text-emerald-600" />
              )}
            </div>
            <h2 className="text-4xl font-bold">
              {state.alreadyCheckedIn ? "Already Checked In" : "Welcome!"}
            </h2>
            <p className="text-2xl">{state.name}</p>
            <p className="text-lg text-muted-foreground">{state.ticketType}</p>
          </div>
        )}

        {/* Error */}
        {state.mode === "error" && (
          <div className="text-center space-y-4 animate-in fade-in duration-300">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-12 w-12 text-red-600" />
            </div>
            <h2 className="text-3xl font-bold text-red-700">Check-in Failed</h2>
            <p className="text-lg text-red-600">{state.message}</p>
          </div>
        )}

        {/* Idle / Scanning */}
        {(state.mode === "idle" || state.mode === "scanning") && (
          <div className="w-full max-w-lg space-y-8 text-center">
            <div className="space-y-2">
              <QrCode className="mx-auto h-12 w-12 text-muted-foreground" />
              <h2 className="text-3xl font-bold">Scan Your QR Code</h2>
              <p className="text-muted-foreground">Hold your QR code in front of the camera</p>
            </div>

            <div className="mx-auto max-w-sm overflow-hidden rounded-2xl border-2 border-primary/20 shadow-lg">
              <div id="kiosk-qr-reader" />
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-background px-4 text-sm text-muted-foreground">or</span>
              </div>
            </div>

            <button
              onClick={() => setState({ mode: "searching" })}
              className="mx-auto flex items-center gap-2 rounded-xl border-2 px-8 py-4 text-lg font-medium hover:bg-muted transition-colors"
            >
              <Search className="h-5 w-5" /> Search by Name
            </button>
          </div>
        )}

        {/* Searching */}
        {state.mode === "searching" && (
          <div className="w-full max-w-lg space-y-6">
            <button onClick={resetToIdle} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Back to scanner
            </button>

            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Type your name or email..."
              className="w-full rounded-xl border-2 px-6 py-4 text-lg outline-none focus:border-primary focus:ring-2 focus:ring-ring"
            />

            {searchLoading && <p className="text-center text-muted-foreground">Searching...</p>}

            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleSelectAttendee(r.id)}
                    className="w-full rounded-xl border p-4 text-left hover:bg-muted transition-colors"
                  >
                    <p className="font-medium text-lg">{r.name}</p>
                    <p className="text-sm text-muted-foreground">{r.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">{getTicketName(r.ticket_types)}</p>
                  </button>
                ))}
              </div>
            )}

            {searchQuery.length >= 2 && !searchLoading && searchResults.length === 0 && (
              <p className="text-center text-muted-foreground">No attendees found</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 3: Create the kiosk page**

Create `apps/web/src/app/(organizer)/events/[eventId]/check-in/kiosk/page.tsx`:

```tsx
import { createClient } from "@attendly/ui/supabase/server";
import { KioskMode } from "@/features/registration/components/kiosk-mode";
import { notFound } from "next/navigation";

export default async function KioskPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("title")
    .eq("id", eventId)
    .single();

  if (!event) notFound();

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, title, start_time")
    .eq("event_id", eventId)
    .eq("enable_check_in", true)
    .order("start_time");

  if (!sessions || sessions.length === 0) notFound();

  return <KioskMode eventId={eventId} eventTitle={event.title} sessions={sessions} />;
}
```

**Step 4: Add "Launch Kiosk" button to check-in page**

In `apps/web/src/app/(organizer)/events/[eventId]/check-in/page.tsx`, add a link after the header div. Add `Link` and `Monitor` to imports:

Add to imports:
```typescript
import Link from "next/link";
import { ScanLine, Monitor } from "lucide-react";
```

Add after the header `<div>` (after line 36), before `<QrScanner>`:
```tsx
      <Link
        href={`/events/${eventId}/check-in/kiosk`}
        className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium hover:bg-muted/50 transition-colors"
      >
        <Monitor className="h-4 w-4" />
        Launch Kiosk Mode
      </Link>
```

**Step 5: Verify build**

Run: `cd apps/web && npx next build --no-lint 2>&1 | tail -5`
Expected: Build succeeds.

**Step 6: Commit**

```bash
git add apps/web/src/features/registration/actions.ts \
  apps/web/src/features/registration/components/kiosk-mode.tsx \
  apps/web/src/app/\(organizer\)/events/\[eventId\]/check-in/kiosk/page.tsx \
  apps/web/src/app/\(organizer\)/events/\[eventId\]/check-in/page.tsx
git commit -m "feat: add kiosk check-in mode with QR scanning and name search"
```

---

## Task 6: Certificates — Actions & Queries

**Files:**
- Create: `apps/web/src/features/certificates/actions.ts`
- Modify: `apps/web/src/features/certificates/queries.ts`

**Step 1: Add eligibility query**

In `apps/web/src/features/certificates/queries.ts`, add these functions after the existing `getCertificateData`:

```typescript
export async function getCertificateConfig(eventId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("certificate_configs")
    .select("*")
    .eq("event_id", eventId)
    .single();
  return data;
}

export async function getEligibleAttendees(eventId: string) {
  const supabase = await createClient();

  const { data: config } = await supabase
    .from("certificate_configs")
    .select("*")
    .eq("event_id", eventId)
    .single();

  if (!config || !config.enabled) return { config: null, eligible: [], issued: [] };

  // Get all check-ins for this event
  const { data: checkIns } = await supabase
    .from("check_ins")
    .select("registration_id, session_id")
    .eq("event_id", eventId);

  // Count check-ins per registration and track which sessions
  const regCheckIns: Record<string, { count: number; sessionIds: Set<string> }> = {};
  for (const ci of checkIns ?? []) {
    if (!regCheckIns[ci.registration_id]) {
      regCheckIns[ci.registration_id] = { count: 0, sessionIds: new Set() };
    }
    regCheckIns[ci.registration_id].count++;
    regCheckIns[ci.registration_id].sessionIds.add(ci.session_id);
  }

  // Get registrations
  const { data: registrations } = await supabase
    .from("registrations")
    .select("id, name, email, status, ticket_types(name)")
    .eq("event_id", eventId)
    .in("status", ["confirmed", "checked_in"])
    .order("name");

  // Filter by eligibility criteria
  const requiredSessions = (config.required_session_ids ?? []) as string[];
  const eligible = (registrations ?? []).filter((r) => {
    const info = regCheckIns[r.id];
    if (!info) return false;
    if (info.count < config.min_check_ins) return false;
    if (requiredSessions.length > 0) {
      for (const sid of requiredSessions) {
        if (!info.sessionIds.has(sid)) return false;
      }
    }
    return true;
  });

  // Get already-issued certificates
  const { data: issued } = await supabase
    .from("certificates_issued")
    .select("registration_id, issued_at, emailed_at")
    .eq("config_id", config.id);

  return { config, eligible, issued: issued ?? [] };
}
```

**Step 2: Create certificate actions**

Create `apps/web/src/features/certificates/actions.ts`:

```typescript
"use server";

import { createClient } from "@attendly/ui/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveCertificateConfig(
  eventId: string,
  data: {
    title: string;
    min_check_ins: number;
    required_session_ids: string[];
    custom_fields: Record<string, string>;
    template_style: string;
    enabled: boolean;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { error } = await supabase
    .from("certificate_configs")
    .upsert(
      {
        event_id: eventId,
        title: data.title,
        min_check_ins: data.min_check_ins,
        required_session_ids: data.required_session_ids,
        custom_fields: data.custom_fields,
        template_style: data.template_style,
        enabled: data.enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_id" }
    );

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/certificates`);
}

export async function issueCertificates(eventId: string, registrationIds: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  const { data: config } = await supabase
    .from("certificate_configs")
    .select("id")
    .eq("event_id", eventId)
    .single();

  if (!config) throw new Error("Certificate config not found");

  const rows = registrationIds.map((rid) => ({
    config_id: config.id,
    registration_id: rid,
  }));

  const { error } = await supabase
    .from("certificates_issued")
    .upsert(rows, { onConflict: "config_id,registration_id" });

  if (error) throw new Error(error.message);
  revalidatePath(`/events/${eventId}/certificates`);
}
```

**Step 3: Commit**

```bash
git add apps/web/src/features/certificates/actions.ts \
  apps/web/src/features/certificates/queries.ts
git commit -m "feat: add certificate config actions and eligibility queries"
```

---

## Task 7: Certificates — Organizer UI

**Files:**
- Create: `apps/web/src/features/certificates/components/certificate-config.tsx`
- Create: `apps/web/src/features/certificates/components/eligible-attendees.tsx`
- Create: `apps/web/src/app/(organizer)/events/[eventId]/certificates/page.tsx`

**Step 1: Create the config component**

Create `apps/web/src/features/certificates/components/certificate-config.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { saveCertificateConfig } from "../actions";

type Session = { id: string; title: string };

export function CertificateConfig({
  eventId,
  sessions,
  initial,
}: {
  eventId: string;
  sessions: Session[];
  initial: {
    title: string;
    min_check_ins: number;
    required_session_ids: string[];
    custom_fields: Record<string, string>;
    template_style: string;
    enabled: boolean;
  } | null;
}) {
  const [title, setTitle] = useState(initial?.title ?? "Certificate of Attendance");
  const [minCheckIns, setMinCheckIns] = useState(initial?.min_check_ins ?? 1);
  const [requiredSessions, setRequiredSessions] = useState<string[]>(initial?.required_session_ids ?? []);
  const [creditHours, setCreditHours] = useState((initial?.custom_fields as any)?.credit_hours ?? "");
  const [enabled, setEnabled] = useState(initial?.enabled ?? false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      await saveCertificateConfig(eventId, {
        title,
        min_check_ins: minCheckIns,
        required_session_ids: requiredSessions,
        custom_fields: creditHours ? { credit_hours: creditHours } : {},
        template_style: "classic",
        enabled,
      });
    });
  }

  function toggleSession(sid: string) {
    setRequiredSessions((prev) =>
      prev.includes(sid) ? prev.filter((s) => s !== sid) : [...prev, sid]
    );
  }

  return (
    <div className="rounded-xl border p-6 space-y-5">
      <h3 className="text-lg font-semibold">Certificate Settings</h3>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Certificate Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Minimum Sessions Attended</label>
        <input
          type="number"
          min={1}
          value={minCheckIns}
          onChange={(e) => setMinCheckIns(parseInt(e.target.value) || 1)}
          className="w-24 rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {sessions.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Required Sessions (optional)</label>
          <p className="text-xs text-muted-foreground">Attendees must have checked into these specific sessions.</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {sessions.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={requiredSessions.includes(s.id)}
                  onChange={() => toggleSession(s.id)}
                  className="accent-foreground"
                />
                {s.title}
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Credit Hours (optional)</label>
        <input
          type="text"
          value={creditHours}
          onChange={(e) => setCreditHours(e.target.value)}
          placeholder="e.g. 5 CEU"
          className="w-48 rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="accent-foreground"
        />
        Enable certificates (attendees can download from event page)
      </label>

      <button
        onClick={handleSave}
        disabled={isPending}
        className="rounded-lg bg-foreground text-background px-5 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Save Configuration"}
      </button>
    </div>
  );
}
```

**Step 2: Create eligible attendees component**

Create `apps/web/src/features/certificates/components/eligible-attendees.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { Award, Download } from "lucide-react";
import { issueCertificates } from "../actions";
import { generateCertificatePdf } from "../generate-certificate";

type Attendee = {
  id: string;
  name: string;
  email: string;
  ticket_types: { name: string } | { name: string }[];
};

type Issued = {
  registration_id: string;
  issued_at: string;
  emailed_at: string | null;
};

export function EligibleAttendees({
  eventId,
  eligible,
  issued,
  eventTitle,
  orgName,
  startDate,
  endDate,
  configId,
}: {
  eventId: string;
  eligible: Attendee[];
  issued: Issued[];
  eventTitle: string;
  orgName: string;
  startDate: string;
  endDate: string;
  configId: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const issuedSet = new Set(issued.map((i) => i.registration_id));
  const unissued = eligible.filter((a) => !issuedSet.has(a.id));

  function handleIssueAll() {
    startTransition(async () => {
      await issueCertificates(eventId, unissued.map((a) => a.id));
    });
  }

  function handleDownloadSingle(attendee: Attendee) {
    const pdf = generateCertificatePdf({
      attendeeName: attendee.name,
      eventTitle,
      organizationName: orgName,
      eventStartDate: startDate,
      eventEndDate: endDate,
    });
    const blob = new Blob([pdf], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `certificate-${attendee.name.toLowerCase().replace(/\s+/g, "-")}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!configId) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <Award className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <p className="mt-3 text-sm text-muted-foreground">
          Save a certificate configuration first to see eligible attendees.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Eligible Attendees ({eligible.length})
        </h3>
        {unissued.length > 0 && (
          <button
            onClick={handleIssueAll}
            disabled={isPending}
            className="rounded-lg bg-foreground text-background px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? "Issuing..." : `Issue ${unissued.length} Certificate${unissued.length !== 1 ? "s" : ""}`}
          </button>
        )}
      </div>

      {eligible.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No attendees meet the eligibility criteria yet.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {eligible.map((a) => {
                const wasIssued = issuedSet.has(a.id);
                return (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">{a.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{a.email}</td>
                    <td className="px-4 py-3">
                      {wasIssued ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                          <Award className="h-3 w-3" /> Issued
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDownloadSingle(a)}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <Download className="h-3 w-3" /> Download PDF
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

**Step 3: Create the certificates page**

Create `apps/web/src/app/(organizer)/events/[eventId]/certificates/page.tsx`:

```tsx
import { createClient } from "@attendly/ui/supabase/server";
import { CertificateConfig } from "@/features/certificates/components/certificate-config";
import { EligibleAttendees } from "@/features/certificates/components/eligible-attendees";
import { getEligibleAttendees } from "@/features/certificates/queries";

export default async function CertificatesPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const supabase = await createClient();

  const { data: event } = await supabase
    .from("events")
    .select("title, start_date, end_date, organization_id")
    .eq("id", eventId)
    .single();

  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", event?.organization_id)
    .single();

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, title")
    .eq("event_id", eventId)
    .eq("enable_check_in", true)
    .order("start_time");

  const { config, eligible, issued } = await getEligibleAttendees(eventId);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold">Certificates</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Set eligibility criteria and generate attendance certificates for qualified attendees.
        </p>
      </div>

      <CertificateConfig
        eventId={eventId}
        sessions={sessions ?? []}
        initial={config}
      />

      <EligibleAttendees
        eventId={eventId}
        eligible={eligible}
        issued={issued}
        eventTitle={event?.title ?? ""}
        orgName={org?.name ?? ""}
        startDate={event?.start_date ?? ""}
        endDate={event?.end_date ?? ""}
        configId={config?.id ?? null}
      />
    </div>
  );
}
```

**Step 4: Verify build**

Run: `cd apps/web && npx next build --no-lint 2>&1 | tail -5`
Expected: Build succeeds.

**Step 5: Commit**

```bash
git add apps/web/src/features/certificates/components/certificate-config.tsx \
  apps/web/src/features/certificates/components/eligible-attendees.tsx \
  apps/web/src/app/\(organizer\)/events/\[eventId\]/certificates/page.tsx
git commit -m "feat: add certificate configuration and eligible attendees UI"
```

---

## Task 8: Certificates — Attendee Download Page

**Files:**
- Create: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/certificate/page.tsx`
- Modify: `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/event-nav.tsx`

**Step 1: Create the attendee certificate download page**

Create `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/certificate/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { createClient } from "@attendly/ui/supabase/server";
import { CertificateDownload } from "@/features/certificates/components/certificate-download";

export default async function PublicCertificatePage({
  params,
}: {
  params: Promise<{ orgSlug: string; eventSlug: string }>;
}) {
  const { orgSlug, eventSlug } = await params;
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("slug", orgSlug)
    .single();
  if (!org) notFound();

  const { data: event } = await supabase
    .from("events")
    .select("id, title, start_date, end_date")
    .eq("organization_id", org.id)
    .eq("slug", eventSlug)
    .single();
  if (!event) notFound();

  // Check if certificates are enabled
  const { data: config } = await supabase
    .from("certificate_configs")
    .select("id, enabled, min_check_ins")
    .eq("event_id", event.id)
    .single();

  if (!config || !config.enabled) notFound();

  // Get current user's registration and check-in count
  const { data: { user } } = await supabase.auth.getUser();

  let registration = null;
  let checkInCount = 0;
  let alreadyIssued = false;

  if (user) {
    const { data: reg } = await supabase
      .from("registrations")
      .select("id, name, email")
      .eq("event_id", event.id)
      .eq("user_id", user.id)
      .in("status", ["confirmed", "checked_in"])
      .single();

    if (reg) {
      registration = reg;

      const { count } = await supabase
        .from("check_ins")
        .select("id", { count: "exact", head: true })
        .eq("registration_id", reg.id)
        .eq("event_id", event.id);

      checkInCount = count ?? 0;

      const { data: issued } = await supabase
        .from("certificates_issued")
        .select("id")
        .eq("config_id", config.id)
        .eq("registration_id", reg.id)
        .single();

      alreadyIssued = !!issued;
    }
  }

  const isEligible = registration && checkInCount >= config.min_check_ins;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-xl font-semibold">Certificate</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Download your attendance certificate for {event.title}.
        </p>
      </div>

      <CertificateDownload
        eligible={!!isEligible}
        loggedIn={!!user}
        registered={!!registration}
        checkInCount={checkInCount}
        minCheckIns={config.min_check_ins}
        attendeeName={registration?.name ?? ""}
        eventTitle={event.title}
        orgName={org.name}
        startDate={event.start_date}
        endDate={event.end_date}
      />
    </div>
  );
}
```

**Step 2: Create the download component**

Create `apps/web/src/features/certificates/components/certificate-download.tsx`:

```tsx
"use client";

import { Award, Download, LogIn } from "lucide-react";
import { generateCertificatePdf } from "../generate-certificate";

export function CertificateDownload({
  eligible,
  loggedIn,
  registered,
  checkInCount,
  minCheckIns,
  attendeeName,
  eventTitle,
  orgName,
  startDate,
  endDate,
}: {
  eligible: boolean;
  loggedIn: boolean;
  registered: boolean;
  checkInCount: number;
  minCheckIns: number;
  attendeeName: string;
  eventTitle: string;
  orgName: string;
  startDate: string;
  endDate: string;
}) {
  function handleDownload() {
    const pdf = generateCertificatePdf({
      attendeeName,
      eventTitle,
      organizationName: orgName,
      eventStartDate: startDate,
      eventEndDate: endDate,
    });
    const blob = new Blob([pdf], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `certificate-${attendeeName.toLowerCase().replace(/\s+/g, "-")}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!loggedIn) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <LogIn className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <p className="mt-3 text-sm text-muted-foreground">
          Please sign in to check your certificate eligibility.
        </p>
      </div>
    );
  }

  if (!registered) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <Award className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <p className="mt-3 text-sm text-muted-foreground">
          You are not registered for this event.
        </p>
      </div>
    );
  }

  if (!eligible) {
    return (
      <div className="rounded-lg border p-8 text-center space-y-2">
        <Award className="mx-auto h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm font-medium">Not yet eligible</p>
        <p className="text-sm text-muted-foreground">
          You have attended {checkInCount} of {minCheckIns} required sessions.
        </p>
        <div className="mx-auto mt-4 w-48">
          <div className="h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(100, (checkInCount / minCheckIns) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-8 text-center space-y-4">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
        <Award className="h-8 w-8 text-emerald-600" />
      </div>
      <div>
        <p className="text-lg font-semibold">Congratulations, {attendeeName}!</p>
        <p className="text-sm text-muted-foreground">
          You have met all the requirements for your certificate.
        </p>
      </div>
      <button
        onClick={handleDownload}
        className="inline-flex items-center gap-2 rounded-lg bg-foreground text-background px-6 py-3 text-sm font-medium hover:opacity-90"
      >
        <Download className="h-4 w-4" /> Download Certificate (PDF)
      </button>
    </div>
  );
}
```

**Step 3: Add "Certificate" nav item to public event nav**

In `apps/web/src/app/(public)/[orgSlug]/[eventSlug]/event-nav.tsx`, add to imports:
```typescript
import { Calendar, Mic2, DoorOpen, Ticket, Megaphone, LogIn, LogOut, Award } from "lucide-react";
```

Add to `navItems` array (before Register):
```typescript
  { label: "Certificate", path: "/certificate", icon: Award },
```

**Step 4: Verify build**

Run: `cd apps/web && npx next build --no-lint 2>&1 | tail -5`
Expected: Build succeeds.

**Step 5: Commit**

```bash
git add apps/web/src/app/\(public\)/\[orgSlug\]/\[eventSlug\]/certificate/page.tsx \
  apps/web/src/features/certificates/components/certificate-download.tsx \
  apps/web/src/app/\(public\)/\[orgSlug\]/\[eventSlug\]/event-nav.tsx
git commit -m "feat: add public certificate download page for eligible attendees"
```

---

## Task 9: Integration — Segments in Announcements

**Files:**
- Modify: `apps/web/src/features/announcements/components/announcement-composer.tsx`

**Step 1: Extend the composer with segment-based audience targeting**

In `apps/web/src/features/announcements/components/announcement-composer.tsx`, replace the static "All Attendees" radio with a segment picker. Add a `ticketTypes` prop and segment selection state:

Add to props:
```tsx
export function AnnouncementComposer({
  eventId,
  ticketTypes,
}: {
  eventId: string;
  ticketTypes: { id: string; name: string }[];
}) {
```

Add state for audience selection:
```tsx
  const [audience, setAudience] = useState<"all" | "ticket_types">("all");
  const [selectedTicketTypes, setSelectedTicketTypes] = useState<string[]>([]);
```

Replace the Target Audience section with:
```tsx
      <div className="space-y-1.5">
        <span className="text-sm font-medium">Target Audience</span>
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" name="audience" value="all" checked={audience === "all"} onChange={() => setAudience("all")} className="accent-foreground" />
            All Attendees
          </label>
          {ticketTypes.length > 0 && (
            <>
              <label className="flex items-center gap-2">
                <input type="radio" name="audience" value="ticket_types" checked={audience === "ticket_types"} onChange={() => setAudience("ticket_types")} className="accent-foreground" />
                By Ticket Type
              </label>
              {audience === "ticket_types" && (
                <div className="ml-6 space-y-1.5">
                  {ticketTypes.map((tt) => (
                    <label key={tt.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedTicketTypes.includes(tt.id)}
                        onChange={(e) =>
                          setSelectedTicketTypes((prev) =>
                            e.target.checked ? [...prev, tt.id] : prev.filter((id) => id !== tt.id)
                          )
                        }
                        className="accent-foreground"
                      />
                      {tt.name}
                    </label>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
```

Update `createAnnouncement` calls to include ticket type targeting:
```typescript
  const targetAudience = audience === "ticket_types" && selectedTicketTypes.length > 0
    ? { type: "ticket_types", ticket_type_ids: selectedTicketTypes }
    : { type: "all" };
```

Pass `target_audience: targetAudience` in both `handleSaveDraft` and `handleSendNow`.

**Step 2: Update the announcements page to pass ticketTypes**

In `apps/web/src/app/(organizer)/events/[eventId]/announcements/page.tsx`, fetch ticket types and pass to composer:

```tsx
  const { data: ticketTypes } = await supabase
    .from("ticket_types")
    .select("id, name")
    .eq("event_id", eventId)
    .order("sort_order");
```

Pass `ticketTypes={ticketTypes ?? []}` to `<AnnouncementComposer>`.

**Step 3: Verify build**

Run: `cd apps/web && npx next build --no-lint 2>&1 | tail -5`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add apps/web/src/features/announcements/components/announcement-composer.tsx \
  apps/web/src/app/\(organizer\)/events/\[eventId\]/announcements/page.tsx
git commit -m "feat: add ticket-type segment targeting to announcements"
```

---

## Task 10: Verify Everything Works End-to-End

**Step 1: Apply migration**

Run: `npx supabase migration up --workdir packages/supabase`

**Step 2: Full build check**

Run: `cd apps/web && npx next build --no-lint 2>&1 | tail -10`
Expected: Build succeeds with no errors.

**Step 3: Browser smoke test**

- Navigate to any event's "Badges" tab — should show configurator with filter panel
- Navigate to "Certificates" tab — should show config form
- Navigate to check-in page — should see "Launch Kiosk Mode" button
- Click "Launch Kiosk Mode" — should enter full-screen self-service mode
- Visit public event page — should see "Certificate" nav item

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: address any build or integration issues from Phase 2"
```

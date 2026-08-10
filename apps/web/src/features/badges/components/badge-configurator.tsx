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
type CustomField = { id: string; label: string; type: string; options: string[] | null };

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

      const blob = new Blob([pdf.buffer as ArrayBuffer], { type: "application/pdf" });
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

        <button
          onClick={handleGenerate}
          disabled={isPending || filtered.length === 0}
          className="flex items-center gap-2 rounded-lg bg-foreground text-background px-6 py-3 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {isPending ? "Generating..." : `Generate ${filtered.length} Badge${filtered.length !== 1 ? "s" : ""} (PDF)`}
        </button>
      </div>

      <SegmentFilter
        ticketTypes={ticketTypes}
        customFields={customFields}
        onChange={setCriteria}
        matchCount={filtered.length}
      />
    </div>
  );
}

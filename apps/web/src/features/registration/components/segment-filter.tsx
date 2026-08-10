"use client";

import { useState } from "react";

type TicketType = { id: string; name: string };
type CustomField = { id: string; label: string; type: string; options: string[] | null };

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

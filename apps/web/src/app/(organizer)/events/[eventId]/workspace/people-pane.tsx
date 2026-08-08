"use client";

import { useState } from "react";
import { Input } from "@attendly/ui/components";

type Registration = {
  id: string;
  full_name: string;
  email: string;
  status: string;
  created_at: string;
  ticket_types: { name: string }[] | { name: string } | null;
};

interface PeoplePaneProps {
  registrations: Registration[];
}

export function PeoplePane({ registrations }: PeoplePaneProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "in" | "awaiting" | "staff">("all");

  const filtered = registrations.filter((r) => {
    if (query && !r.full_name.toLowerCase().includes(query.toLowerCase()) && !r.email.toLowerCase().includes(query.toLowerCase())) return false;
    if (filter === "in") return r.status === "checked_in";
    if (filter === "awaiting") return r.status !== "checked_in";
    return true;
  });

  const chips = [
    { key: "all" as const, label: "All" },
    { key: "in" as const, label: "In" },
    { key: "awaiting" as const, label: "Awaiting" },
    { key: "staff" as const, label: "Staff" },
  ];

  function getInitials(name: string) {
    return name.split(" ").map((n) => n[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  }

  return (
    <div className="border-r border-border-subtle p-4 lg:p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">People</span>
        <span className="text-[13px] font-bold tabular-nums text-muted-foreground">{registrations.length}</span>
      </div>

      {/* Search */}
      <Input
        placeholder="Search name, email, code..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="!py-2 !px-2.5 !text-[13px] !rounded-[6px]"
      />

      {/* Filter chips */}
      <div className="flex gap-1.5">
        {chips.map((c) => (
          <button
            key={c.key}
            onClick={() => setFilter(c.key)}
            className={`rounded-full px-[11px] py-1 text-[12px] font-bold transition-colors ${
              filter === c.key
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:border-primary/30"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto -mx-1">
        {filtered.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-3 px-3 py-[11px] border-b border-border-subtle hover:bg-primary/[0.03] cursor-pointer transition-colors"
          >
            <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[6px] bg-[oklch(0.93_0.03_255)] text-[oklch(0.42_0.14_255)] text-[11px] font-bold">
              {getInitials(r.full_name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-bold truncate">{r.full_name}</div>
              <div className="text-[11px] font-medium text-muted-foreground truncate">
                {(Array.isArray(r.ticket_types) ? r.ticket_types[0]?.name : r.ticket_types?.name) ?? r.email}
              </div>
            </div>
            <div
              className={`h-[7px] w-[7px] rounded-full shrink-0 ${
                r.status === "checked_in" ? "bg-success-solid" : "bg-[oklch(0.86_0.015_250)]"
              }`}
            />
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="py-8 text-center text-[13px] text-muted-foreground">No people found</div>
        )}
      </div>
    </div>
  );
}

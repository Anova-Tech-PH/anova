"use client";

import { Calendar } from "lucide-react";

interface DaySelectorProps {
  groups: { dateKey: string; label: string; count: number }[];
  activeDay: string | null;
  activeTab: string;
  search?: string;
}

export function DaySelector({ groups, activeDay, activeTab, search }: DaySelectorProps) {
  return (
    <div className="mt-6 flex items-center gap-3 sm:hidden">
      <Calendar className="h-4 w-4 text-primary" />
      <div className="relative">
        <select
          value={activeDay ?? ""}
          onChange={(e) => {
            const params = new URLSearchParams({
              ...(activeTab === "my-agenda" ? { tab: "my-agenda" } : {}),
              ...(search ? { search } : {}),
              day: e.target.value,
            });
            window.location.href = `?${params.toString()}`;
          }}
          className="appearance-none rounded-lg border bg-background pl-3 pr-8 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
        >
          {groups.map((g) => (
            <option key={g.dateKey} value={g.dateKey}>
              {g.label} ({g.count} sessions)
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
          <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}

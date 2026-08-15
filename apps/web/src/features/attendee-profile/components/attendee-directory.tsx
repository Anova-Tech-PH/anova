"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, useCallback } from "react";
import { Search, Users, Star, Layers, Sparkles } from "lucide-react";
import { Input, Button } from "@attendly/ui/components";
import { AttendeeCard, type AttendeeCardProfile } from "./attendee-card";

interface AttendeeDirectoryProps {
  eventId: string;
  profiles: AttendeeCardProfile[];
  total: number;
  bookmarkedIds: string[];
  categoryMap: Record<string, { name: string; color: string }>;
  attendeeNotes: Record<string, string>;
  currentTab: "all" | "recommended" | "bookmarked" | "categories";
  currentSearch: string;
  currentPage: number;
  basePath: string;
}

const PAGE_SIZE = 24;

const tabs = [
  { key: "all" as const, label: "All", icon: Users },
  { key: "recommended" as const, label: "Recommended", icon: Sparkles },
  { key: "bookmarked" as const, label: "Bookmarked", icon: Star },
  { key: "categories" as const, label: "Categories", icon: Layers },
];

function groupAlphabetically(profiles: AttendeeCardProfile[]) {
  const groups: Record<string, AttendeeCardProfile[]> = {};
  for (const p of profiles) {
    const letter = (p.display_name?.[0] ?? "#").toUpperCase();
    const key = /[A-Z]/.test(letter) ? letter : "#";
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

export function AttendeeDirectory({
  eventId,
  profiles,
  total,
  bookmarkedIds,
  categoryMap,
  attendeeNotes,
  currentTab,
  currentSearch,
  currentPage,
  basePath,
}: AttendeeDirectoryProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(currentSearch);
  const [isPending, startTransition] = useTransition();

  const bookmarkedSet = new Set(bookmarkedIds);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const grouped = groupAlphabetically(profiles);

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      const qs = params.toString();
      startTransition(() => {
        router.push(`${basePath}${qs ? `?${qs}` : ""}`);
      });
    },
    [searchParams, basePath, router]
  );

  function handleTabChange(tab: string) {
    updateParams({ tab: tab === "all" ? undefined : tab, page: undefined });
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateParams({ search: search || undefined, page: undefined });
  }

  function handlePageChange(page: number) {
    updateParams({ page: page === 1 ? undefined : String(page) });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-foreground">Attendee Directory</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total.toLocaleString()} attendee{total !== 1 ? "s" : ""} total
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg bg-muted/50 p-1">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              currentTab === key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, company, title, or location..."
            className="pl-9"
          />
        </div>
      </form>

      {/* Loading overlay */}
      <div className={isPending ? "pointer-events-none opacity-60" : ""}>
        {/* Results */}
        {profiles.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-3 text-sm text-muted-foreground">
              {currentSearch
                ? "No attendees match your search."
                : currentTab === "bookmarked"
                  ? "You haven't bookmarked any attendees yet."
                  : "No attendees found."}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map(([letter, groupProfiles]) => (
              <div key={letter}>
                <div className="mb-3 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-xs font-bold text-muted-foreground">
                    {letter}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {groupProfiles.map((profile) => (
                    <AttendeeCard
                      key={profile.id}
                      profile={profile}
                      eventId={eventId}
                      basePath={basePath}
                      isBookmarked={bookmarkedSet.has(profile.id)}
                      categoryName={categoryMap[profile.id]?.name}
                      categoryColor={categoryMap[profile.id]?.color}
                      noteContent={attendeeNotes[profile.id] ?? ""}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              Previous
            </Button>
            <span className="px-3 text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

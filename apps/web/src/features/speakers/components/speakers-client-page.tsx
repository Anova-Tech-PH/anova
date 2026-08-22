"use client";

import { useState, useMemo } from "react";
import { Search, RotateCcw, User } from "lucide-react";
import {
  SpeakerProfileModal,
  type SpeakerForModal,
} from "./speaker-profile-modal";

export interface SpeakerWithSessions {
  id: string;
  name: string;
  title: string | null;
  company: string | null;
  bio: string | null;
  photo: string | null;
  user_id: string | null;
  is_featured: boolean;
  sessions: {
    id: string;
    title: string;
    start_time: string | null;
    end_time: string | null;
    tracks: { name: string; color: string }[];
  }[];
}

interface SpeakersClientPageProps {
  speakers: SpeakerWithSessions[];
  eventTitle: string;
  eventId: string;
  basePath: string;
  isLoggedIn: boolean;
  bookmarkedSpeakerIds: string[];
  speakerNotes: Record<string, string>;
}

export function SpeakersClientPage({
  speakers,
  eventTitle,
  eventId,
  basePath,
  isLoggedIn,
  bookmarkedSpeakerIds,
  speakerNotes,
}: SpeakersClientPageProps) {
  const [search, setSearch] = useState("");
  const [dayFilter, setDayFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selectedSpeaker, setSelectedSpeaker] =
    useState<SpeakerWithSessions | null>(null);

  // Extract unique days from all sessions
  const days = useMemo(() => {
    const daySet = new Set<string>();
    for (const speaker of speakers) {
      for (const session of speaker.sessions) {
        if (session.start_time) {
          const date = session.start_time.split("T")[0];
          daySet.add(date);
        }
      }
    }
    return Array.from(daySet).sort();
  }, [speakers]);

  // Extract unique track/category names from all sessions
  const categories = useMemo(() => {
    const catSet = new Set<string>();
    for (const speaker of speakers) {
      for (const session of speaker.sessions) {
        for (const track of session.tracks) {
          catSet.add(track.name);
        }
      }
    }
    return Array.from(catSet).sort();
  }, [speakers]);

  // Filter speakers
  const filteredSpeakers = useMemo(() => {
    return speakers.filter((speaker) => {
      // Search filter
      if (search) {
        const q = search.toLowerCase();
        const matchesName = speaker.name.toLowerCase().includes(q);
        const matchesTitle = speaker.title?.toLowerCase().includes(q) ?? false;
        const matchesCompany =
          speaker.company?.toLowerCase().includes(q) ?? false;
        if (!matchesName && !matchesTitle && !matchesCompany) return false;
      }

      // Day filter
      if (dayFilter) {
        const hasSessionOnDay = speaker.sessions.some((session) => {
          if (!session.start_time) return false;
          return session.start_time.split("T")[0] === dayFilter;
        });
        if (!hasSessionOnDay) return false;
      }

      // Category filter
      if (categoryFilter) {
        const hasTrack = speaker.sessions.some((session) =>
          session.tracks.some((track) => track.name === categoryFilter),
        );
        if (!hasTrack) return false;
      }

      return true;
    });
  }, [speakers, search, dayFilter, categoryFilter]);

  function resetFilters() {
    setSearch("");
    setDayFilter("");
    setCategoryFilter("");
  }

  function formatDay(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00Z");
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  // Convert SpeakerWithSessions to SpeakerForModal
  function toModalSpeaker(speaker: SpeakerWithSessions): SpeakerForModal {
    return {
      id: speaker.id,
      name: speaker.name,
      title: speaker.title,
      company: speaker.company,
      bio: speaker.bio,
      photo: speaker.photo,
      user_id: speaker.user_id,
      sessions: speaker.sessions.map((s) => ({
        id: s.id,
        title: s.title,
        start_time: s.start_time,
        end_time: s.end_time,
      })),
    };
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="max-w-6xl mx-auto px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Speakers</h1>
        <p className="text-sm text-gray-500 mt-1">
          {speakers.length} speaker{speakers.length !== 1 ? "s" : ""} at{" "}
          {eventTitle}
        </p>
      </div>

      {/* Filters Row */}
      <div className="max-w-6xl mx-auto px-4 pb-6">
        <div className="grid grid-cols-2 gap-3 mb-6 sm:flex sm:flex-wrap sm:items-center">
          {/* Day filter */}
          <select
            aria-label="Speaking on"
            value={dayFilter}
            onChange={(e) => setDayFilter(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="">All days</option>
            {days.map((day) => (
              <option key={day} value={day}>
                {formatDay(day)}
              </option>
            ))}
          </select>

          {/* Category filter */}
          <select
            aria-label="Categories"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="">All categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Reset button */}
          <button
            onClick={resetFilters}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-sm border rounded-md hover:bg-gray-100 bg-white"
          >
            <RotateCcw className="h-4 w-4" />
            Reset filters
          </button>

          {/* Search input */}
          <div className="relative sm:flex-1 sm:min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, title, or company..."
              className="w-full border rounded-md pl-9 pr-3 py-2 text-sm bg-white"
            />
          </div>
        </div>

        {/* Speaker Grid */}
        {filteredSpeakers.length === 0 ? (
          <div className="text-center py-16">
            <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No speakers found</p>
            {(search || dayFilter || categoryFilter) && (
              <p className="text-gray-400 text-sm mt-1">
                Try adjusting your filters
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredSpeakers.map((speaker) => (
              <div
                key={speaker.id}
                onClick={() => setSelectedSpeaker(speaker)}
                className="bg-white rounded-lg border shadow-sm overflow-hidden flex flex-row items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 sm:flex-col sm:items-stretch sm:gap-0 sm:p-0"
              >
                {/* Photo area - circle on mobile, square on sm+ */}
                <div className="h-16 w-16 shrink-0 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden sm:h-auto sm:w-full sm:rounded-none sm:aspect-[4/3]">
                  {speaker.photo ? (
                    <img
                      src={speaker.photo}
                      alt={speaker.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xl font-bold text-gray-400 sm:text-4xl">
                      {getInitials(speaker.name)}
                    </span>
                  )}
                </div>

                {/* Card body */}
                <div className="flex flex-col flex-1 min-w-0 sm:p-4">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {speaker.name}
                  </h3>
                  {speaker.title && (
                    <p className="text-sm text-gray-600 mt-0.5 truncate">
                      {speaker.title}
                    </p>
                  )}
                  {speaker.company && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate sm:hidden">
                      {speaker.company}
                    </p>
                  )}
                  <span className="inline-block mt-1.5 text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full w-fit sm:mt-2">
                    Speaker
                  </span>
                </div>

                {/* Chevron on mobile */}
                <div className="text-gray-400 sm:hidden">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Speaker Modal */}
      {selectedSpeaker && (
        <SpeakerProfileModal
          speaker={toModalSpeaker(selectedSpeaker)}
          eventId={eventId}
          isBookmarked={bookmarkedSpeakerIds.includes(selectedSpeaker.id)}
          noteContent={speakerNotes[selectedSpeaker.id] ?? ""}
          isLoggedIn={isLoggedIn}
          onClose={() => setSelectedSpeaker(null)}
          basePath={basePath}
        />
      )}
    </div>
  );
}

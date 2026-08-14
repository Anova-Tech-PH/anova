"use client";

import { useState } from "react";
import { Plus, Search, MessageSquare } from "lucide-react";
import { Button, Input } from "@attendly/ui/components";
import { useRouter, useSearchParams } from "next/navigation";
import { TopicCard, type TopicCardData } from "./topic-card";
import { CreateTopicDialog } from "./create-topic-dialog";
import { IcebreakerDialog } from "./icebreaker-dialog";

interface CommunityBoardProps {
  eventId: string;
  topics: TopicCardData[];
  totalCount: number;
  currentTab: string;
  currentSearch: string;
  basePath: string;
  icebreaker: {
    question: string;
    options: string[] | null;
    hasResponded: boolean;
  } | null;
}

const tabs = [
  { value: "all", label: "All Topics" },
  { value: "following", label: "Following" },
  { value: "by_organizers", label: "By Organizers" },
  { value: "new", label: "New" },
] as const;

export function CommunityBoard({
  eventId,
  topics,
  totalCount,
  currentTab,
  currentSearch,
  basePath,
  icebreaker,
}: CommunityBoardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showCreate, setShowCreate] = useState(false);
  const [searchValue, setSearchValue] = useState(currentSearch);

  function updateParams(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Reset to first state when changing tabs
    if (key === "tab") {
      params.delete("search");
      setSearchValue("");
    }
    router.push(`${basePath}?${params.toString()}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    updateParams("search", searchValue);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Community
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {totalCount} topic{totalCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-lg bg-muted p-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => updateParams("tab", tab.value === "all" ? "" : tab.value)}
            className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              currentTab === tab.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search topics..."
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline" size="sm" className="h-9">
          Search
        </Button>
      </form>

      {/* Topic list */}
      {topics.length > 0 ? (
        <div className="space-y-3">
          {topics.map((topic) => (
            <TopicCard key={topic.id} topic={topic} basePath={basePath} />
          ))}
        </div>
      ) : (
        <div className="py-12 text-center">
          <MessageSquare className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm text-muted-foreground">
            {currentSearch
              ? "No topics match your search."
              : "No topics yet. Be the first to start a conversation!"}
          </p>
        </div>
      )}

      {/* Add topic button */}
      <div className="flex justify-center pt-2">
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add new topic
        </Button>
      </div>

      {/* Create topic dialog */}
      <CreateTopicDialog
        eventId={eventId}
        open={showCreate}
        onClose={() => setShowCreate(false)}
      />

      {/* Icebreaker dialog */}
      {icebreaker && (
        <IcebreakerDialog
          eventId={eventId}
          question={icebreaker.question}
          options={icebreaker.options}
          hasResponded={icebreaker.hasResponded}
        />
      )}
    </div>
  );
}

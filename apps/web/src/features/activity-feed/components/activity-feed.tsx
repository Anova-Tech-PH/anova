"use client";

import { useState, useTransition } from "react";
import { FeedItem } from "./feed-item";
import { getActivityFeed } from "../queries";
import type { ActivityFeedItem } from "../queries";

export function ActivityFeed({
  eventId,
  initialItems,
  total,
}: {
  eventId: string;
  initialItems: ActivityFeedItem[];
  total: number;
}) {
  const [items, setItems] = useState(initialItems);
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  const hasMore = items.length < total;

  function handleLoadMore() {
    const nextPage = page + 1;
    startTransition(async () => {
      const result = await getActivityFeed(eventId, { page: nextPage });
      setItems((prev) => [...prev, ...result.items]);
      setPage(nextPage);
    });
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <FeedItem key={item.id} item={item} />
      ))}
      {hasMore && (
        <button
          onClick={handleLoadMore}
          disabled={isPending}
          className="w-full rounded-lg border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
        >
          {isPending ? "Loading..." : "Load more"}
        </button>
      )}
    </div>
  );
}

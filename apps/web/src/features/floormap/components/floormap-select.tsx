"use client";

import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";

export function FloormapSelect({
  floormaps,
  activeId,
  basePath,
}: {
  floormaps: { id: string; name: string }[];
  activeId: string;
  basePath: string;
}) {
  const router = useRouter();

  return (
    <div className="relative w-full max-w-sm">
      <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <select
        value={activeId}
        onChange={(e) => router.push(`${basePath}?map=${e.target.value}`)}
        className="w-full appearance-none rounded-lg border border-border bg-background py-2 pl-9 pr-8 text-sm font-medium outline-none transition-colors focus:ring-2 focus:ring-primary/20"
      >
        {floormaps.map((fm) => (
          <option key={fm.id} value={fm.id}>
            {fm.name}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </div>
  );
}

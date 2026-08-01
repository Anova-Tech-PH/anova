"use client";

import { useRouter, usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

export function MobileTabSelect({
  tabs,
}: {
  tabs: { href: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  const current = tabs.find((t) => t.href === pathname) ?? tabs[0];

  return (
    <div className="relative sm:hidden">
      <select
        value={current.href}
        onChange={(e) => router.push(e.target.value)}
        className="h-10 w-full appearance-none rounded-lg border bg-background pl-3 pr-9 text-sm font-medium outline-none ring-ring focus:ring-2"
      >
        {tabs.map((tab) => (
          <option key={tab.href} value={tab.href}>
            {tab.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

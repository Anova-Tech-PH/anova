"use client";

import { cn } from "@attendly/ui/cn";
import {
  BarChart3,
  Globe,
  LayoutGrid,
  Megaphone,
  Ticket,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEventNav } from "./event-nav-context";

const iconMap: Record<string, LucideIcon> = {
  "layout-grid": LayoutGrid,
  ticket: Ticket,
  megaphone: Megaphone,
  globe: Globe,
  "bar-chart-3": BarChart3,
};

export interface TabItem {
  href: string;
  label: string;
  icon: string;
  children?: { href: string; label: string }[];
}

export interface TopTabGroup {
  label: string;
  icon: string;
  firstHref: string;
  items: TabItem[];
}

export function isGroupActive(group: TopTabGroup, pathname: string): boolean {
  return group.items.some((item) => {
    if (item.children && item.children.length > 0) {
      return pathname.startsWith(item.href);
    }
    return pathname === item.href;
  });
}

export function EventTopTabs({ groups }: { groups: TopTabGroup[] }) {
  const { activePathname, navigate } = useEventNav();

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center gap-1 rounded-lg bg-zinc-900 p-1">
        {groups.map((group) => {
          const active = isGroupActive(group, activePathname);
          const Icon = iconMap[group.icon];

          return (
            <button
              key={group.label}
              type="button"
              onClick={() => navigate(group.firstHref)}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer",
                active
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-300 hover:bg-white/10 hover:text-white"
              )}
            >
              {Icon && <Icon className="h-4 w-4 shrink-0" />}
              {group.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

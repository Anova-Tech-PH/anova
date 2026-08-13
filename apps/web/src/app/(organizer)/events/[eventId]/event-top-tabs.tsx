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
    if (pathname === item.href) return true;
    if (item.children && item.children.length > 0) {
      return pathname.startsWith(item.href) ||
        item.children.some((child) => pathname === child.href);
    }
    return false;
  });
}

export function EventTopTabs({ groups }: { groups: TopTabGroup[] }) {
  const { activePathname, navigate } = useEventNav();

  return (
    <div className="overflow-x-auto">
      <div className="flex items-center gap-1 rounded-xl border bg-muted/50 p-1">
        {groups.map((group) => {
          const active = isGroupActive(group, activePathname);
          const Icon = iconMap[group.icon];

          return (
            <button
              key={group.label}
              type="button"
              onClick={() => navigate(group.firstHref)}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-all duration-200 cursor-pointer",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-background/80 hover:text-foreground"
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

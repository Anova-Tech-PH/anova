"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@attendly/ui/cn";
import {
  BarChart2, BarChart3, Calendar, CalendarCheck, CalendarClock, Camera, CircleDot, ClipboardList,
  DoorOpen, IdCard, LayoutGrid, ListChecks, Mail, Map, Megaphone, Mic, Monitor,
  MessageSquare, Globe, QrCode, Rocket, Settings, Shield, Tag, Ticket, Trophy, Users, Award, Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { isGroupActive, type TopTabGroup, type TabItem } from "./event-top-tabs";
import { useEventNav } from "./event-nav-context";

const iconMap: Record<string, LucideIcon> = {
  "bar-chart-2": BarChart2,
  "bar-chart-3": BarChart3,
  calendar: Calendar,
  "calendar-check": CalendarCheck,
  "clipboard-list": ClipboardList,
  "door-open": DoorOpen,
  globe: Globe,
  "id-card": IdCard,
  "layout-grid": LayoutGrid,
  "list-checks": ListChecks,
  mail: Mail,
  megaphone: Megaphone,
  mic: Mic,
  "message-square": MessageSquare,
  "qr-code": QrCode,
  rocket: Rocket,
  settings: Settings,
  shield: Shield,
  tag: Tag,
  ticket: Ticket,
  users: Users,
  award: Award,
  camera: Camera,
  "calendar-clock": CalendarClock,
  "circle-dot": CircleDot,
  map: Map,
  monitor: Monitor,
  trophy: Trophy,
  zap: Zap,
};

export function MobileEventNav({
  groups,
}: {
  groups: TopTabGroup[];
}) {
  const pathname = usePathname();
  const { activePathname, navigate } = useEventNav();
  const [open, setOpen] = useState(false);

  // Use optimistic pathname for group detection
  const activeGroup =
    groups.find((g) => isGroupActive(g, activePathname)) ?? groups[0];

  const [expandedMobile, setExpandedMobile] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (activeGroup) {
      for (const item of activeGroup.items) {
        if (item.children && pathname.startsWith(item.href)) {
          initial[item.href] = true;
        }
      }
    }
    return initial;
  });

  const toggleExpandedMobile = (href: string) => {
    setExpandedMobile((prev) => ({ ...prev, [href]: !prev[href] }));
  };

  // Current page detection scoped to active group
  const activeItems = activeGroup?.items ?? [];
  const allChildren = activeItems.flatMap((item) =>
    (item.children ?? []).map((child) => ({ ...child, parentIcon: item.icon }))
  );
  const matchedChild = allChildren.find((c) => c.href === pathname);
  const current = matchedChild
    ? { ...activeItems.find((t) => t.children?.some((c) => c.href === pathname))!, label: matchedChild.label }
    : activeItems.find((t) => t.href === pathname) ?? activeItems[0];
  const CurrentIcon = current ? iconMap[current.icon] : null;

  return (
    <div className="lg:hidden space-y-2">
      {/* Top tab bar — always visible */}
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

      {/* Dropdown button + expandable list for active category */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-10 w-full items-center justify-between rounded-lg border bg-background px-3 text-sm font-medium"
      >
        <span className="flex items-center gap-2">
          {CurrentIcon && <CurrentIcon className="h-4 w-4" />}
          {current?.label}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden rounded-b-lg border border-t-0 bg-background"
          >
            <div className="max-h-80 overflow-y-auto p-2">
              {activeItems.map((item) => {
                const hasChildren = item.children && item.children.length > 0;
                const isActive = hasChildren
                  ? pathname.startsWith(item.href)
                  : pathname === item.href;
                const isExpanded = expandedMobile[item.href] ?? pathname.startsWith(item.href);
                const Icon = iconMap[item.icon];

                if (hasChildren) {
                  return (
                    <div key={item.href}>
                      <div className="flex items-center">
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex flex-1 items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                            isActive
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-foreground hover:bg-muted"
                          )}
                        >
                          {Icon && <Icon className="h-4 w-4" />}
                          {item.label}
                        </Link>
                        <button
                          type="button"
                          onClick={() => toggleExpandedMobile(item.href)}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
                        >
                          <ChevronDown
                            className={cn(
                              "h-3.5 w-3.5 transition-transform duration-200",
                              isExpanded && "rotate-180"
                            )}
                          />
                        </button>
                      </div>
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="overflow-hidden"
                          >
                            <div className="ml-5 border-l border-border pl-2 py-0.5">
                              {item.children!.map((child) => {
                                const isChildActive = pathname === child.href;
                                return (
                                  <Link
                                    key={child.href}
                                    href={child.href}
                                    onClick={() => setOpen(false)}
                                    className={cn(
                                      "flex items-center gap-2 rounded-md px-3 py-1 text-xs transition-colors",
                                      isChildActive
                                        ? "bg-primary/10 text-primary font-medium"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    )}
                                  >
                                    <span className="h-1 w-1 rounded-full bg-current shrink-0" />
                                    {child.label}
                                  </Link>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                }

                if (item.disabled) {
                  return (
                    <div
                      key={item.label}
                      className="flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground/40 cursor-default"
                    >
                      {Icon && <Icon className="h-4 w-4" />}
                      {item.label}
                      <span className="ml-auto text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60 bg-muted/50 px-1.5 py-0.5 rounded">
                        Soon
                      </span>
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

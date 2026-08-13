"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@attendly/ui/cn";
import {
  BarChart2, BarChart3, Calendar, CalendarCheck, ClipboardList,
  DoorOpen, FileText, IdCard, ListChecks, Mail, Megaphone, Mic, MessageCircle, MessageSquare,
  Globe, QrCode, Settings, Tag, Ticket, Users, Award,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { TopTabGroup, TabItem } from "./event-top-tabs";
import { isGroupActive } from "./event-top-tabs";
import { useEventNav } from "./event-nav-context";

const iconMap: Record<string, LucideIcon> = {
  "bar-chart-2": BarChart2,
  "bar-chart-3": BarChart3,
  calendar: Calendar,
  "calendar-check": CalendarCheck,
  "clipboard-list": ClipboardList,
  "door-open": DoorOpen,
  "file-text": FileText,
  globe: Globe,
  "id-card": IdCard,
  "list-checks": ListChecks,
  mail: Mail,
  megaphone: Megaphone,
  mic: Mic,
  "message-circle": MessageCircle,
  "message-square": MessageSquare,
  "qr-code": QrCode,
  settings: Settings,
  tag: Tag,
  ticket: Ticket,
  users: Users,
  award: Award,
};

export function EventSubSidebar({
  eventTitle,
  groups,
}: {
  eventTitle: string;
  groups: TopTabGroup[];
}) {
  const { activePathname, navigate } = useEventNav();

  const activeGroup =
    groups.find((g) => isGroupActive(g, activePathname)) ?? groups[0];

  // Track which parent items are expanded
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (activeGroup) {
      for (const item of activeGroup.items) {
        if (item.children && activePathname.startsWith(item.href)) {
          initial[item.href] = true;
        }
      }
    }
    return initial;
  });

  // Auto-expand items when activePathname changes
  useEffect(() => {
    if (!activeGroup) return;
    const newExpanded: Record<string, boolean> = {};
    for (const item of activeGroup.items) {
      if (item.children && activePathname.startsWith(item.href)) {
        newExpanded[item.href] = true;
      }
    }
    setExpanded((prev) => ({ ...prev, ...newExpanded }));
  }, [activePathname, activeGroup]);

  const toggleExpanded = (href: string) => {
    setExpanded((prev) => ({ ...prev, [href]: !prev[href] }));
  };

  if (!activeGroup) return null;

  return (
    <motion.aside
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="hidden w-56 shrink-0 border-r bg-sidebar lg:flex lg:flex-col"
    >
      {/* Event header */}
      <div className="flex h-14 flex-col justify-center border-b px-4">
        <Link
          href="/events"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Events
        </Link>
        <p className="mt-0.5 truncate text-sm font-semibold">{eventTitle}</p>
      </div>

      {/* Active group navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        <div className="flex flex-col gap-0.5">
          {activeGroup.items.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const isActive = hasChildren
              ? activePathname.startsWith(item.href)
              : activePathname === item.href;
            const isExpanded = expanded[item.href] ?? activePathname.startsWith(item.href);
            const Icon = iconMap[item.icon];

            if (hasChildren) {
              return (
                <div key={item.href}>
                  <div className="relative flex items-center">
                    <button
                      type="button"
                      onClick={() => navigate(item.href)}
                      className={cn(
                        "group relative flex flex-1 items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-all duration-200 cursor-pointer text-left",
                        isActive
                          ? "text-sidebar-accent-foreground font-medium"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/40"
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="event-sidebar-indicator"
                          className="absolute inset-0 rounded-lg bg-sidebar-accent shadow-sm"
                          transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                        />
                      )}
                      <span className="relative flex items-center gap-2.5">
                        {Icon && <Icon className="h-4 w-4 shrink-0" />}
                        <span>{item.label}</span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleExpanded(item.href)}
                      className="relative z-10 flex h-7 w-7 items-center justify-center rounded-md text-sidebar-foreground/60 hover:bg-sidebar-accent/40 transition-colors"
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
                        <div className="ml-4 border-l border-sidebar-accent/60 pl-2 py-1">
                          {item.children!.map((child) => {
                            const isChildActive = activePathname === child.href;
                            return (
                              <button
                                type="button"
                                key={child.href}
                                onClick={() => navigate(child.href)}
                                className={cn(
                                  "flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors cursor-pointer text-left",
                                  isChildActive
                                    ? "text-sidebar-accent-foreground font-medium bg-sidebar-accent/50"
                                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground"
                                )}
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-current shrink-0" />
                                {child.label}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }

            return (
              <button
                type="button"
                key={item.href}
                onClick={() => navigate(item.href)}
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-all duration-200 cursor-pointer text-left",
                  isActive
                    ? "text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/40"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="event-sidebar-indicator"
                    className="absolute inset-0 rounded-lg bg-sidebar-accent shadow-sm"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                  />
                )}
                <span className="relative flex items-center gap-2.5">
                  {Icon && <Icon className="h-4 w-4 shrink-0" />}
                  <span>{item.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </motion.aside>
  );
}

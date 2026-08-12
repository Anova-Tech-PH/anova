"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@attendly/ui/cn";
import {
  BarChart2, BarChart3, Calendar, CalendarCheck, ClipboardList,
  DoorOpen, FileText, IdCard, ListChecks, Mail, Megaphone, MessageSquare,
  Globe, QrCode, Settings, Tag, Ticket, Users, Award,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

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
  "message-square": MessageSquare,
  "qr-code": QrCode,
  settings: Settings,
  tag: Tag,
  ticket: Ticket,
  users: Users,
  award: Award,
};

interface TabItem {
  href: string;
  label: string;
  icon: string;
}

interface TabGroup {
  label: string;
  items: TabItem[];
}

export function EventSubSidebar({
  eventTitle,
  groups,
}: {
  eventTitle: string;
  groups: TabGroup[];
}) {
  const pathname = usePathname();

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

      {/* Grouped navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        {groups.map((group) => (
          <div key={group.label} className="mb-3">
            <div className="flex items-center gap-2 px-3 py-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                {group.label}
              </p>
            </div>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const isActive = item.href === pathname;
                const Icon = iconMap[item.icon];
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-all duration-200",
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
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </motion.aside>
  );
}

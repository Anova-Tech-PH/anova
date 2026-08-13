"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@attendly/ui/cn";
import {
  BarChart2, BarChart3, Calendar, CalendarCheck, ClipboardList,
  DoorOpen, IdCard, ListChecks, Mail, Megaphone, MessageSquare,
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
  children?: { href: string; label: string }[];
}

interface TabGroup {
  label: string;
  items: TabItem[];
}

export function MobileEventNav({
  groups,
}: {
  groups: TabGroup[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const [expandedMobile, setExpandedMobile] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const group of groups) {
      for (const item of group.items) {
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

  const allItems = groups.flatMap((g) => g.items);
  // Check children first for exact match, then parents
  const allChildren = allItems.flatMap((item) =>
    (item.children ?? []).map((child) => ({ ...child, parentIcon: item.icon }))
  );
  const matchedChild = allChildren.find((c) => c.href === pathname);
  const current = matchedChild
    ? { ...allItems.find((t) => t.children?.some((c) => c.href === pathname))!, label: matchedChild.label }
    : allItems.find((t) => t.href === pathname) ?? allItems[0];
  const CurrentIcon = current ? iconMap[current.icon] : null;

  return (
    <div className="lg:hidden">
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
              {groups.map((group) => (
                <div key={group.label} className="mb-2">
                  <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.label}
                  </p>
                  {group.items.map((item) => {
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
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

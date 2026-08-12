"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, useEffect, useCallback } from "react";
import { cn } from "@attendly/ui/cn";
import {
  BarChart2, BarChart3, Calendar, CalendarCheck, ChevronLeft, ChevronRight,
  ClipboardList, DoorOpen, IdCard, ListChecks, Mail, Megaphone, MessageSquare,
  Globe, QrCode, Settings, Tag, Ticket, Users, Award,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  "bar-chart-2": BarChart2,
  "bar-chart-3": BarChart3,
  "calendar": Calendar,
  "calendar-check": CalendarCheck,
  "clipboard-list": ClipboardList,
  "door-open": DoorOpen,
  "globe": Globe,
  "id-card": IdCard,
  "list-checks": ListChecks,
  "mail": Mail,
  "megaphone": Megaphone,
  "message-square": MessageSquare,
  "qr-code": QrCode,
  "settings": Settings,
  "tag": Tag,
  "ticket": Ticket,
  "users": Users,
  "award": Award,
};

export function DesktopTabs({
  tabs,
}: {
  tabs: { href: string; label: string; icon: string }[];
}) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = navRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      observer.disconnect();
    };
  }, [updateScrollState]);

  const scroll = (direction: "left" | "right") => {
    const el = navRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === "left" ? -200 : 200, behavior: "smooth" });
  };

  return (
    <div className="relative hidden sm:block">
      {/* Left fade + arrow */}
      {canScrollLeft && (
        <>
          <div className="pointer-events-none absolute left-0 top-0 bottom-px z-10 w-12 bg-gradient-to-r from-background to-transparent" />
          <button
            type="button"
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 z-20 -translate-y-1/2 rounded-full border bg-background p-1 shadow-sm transition-colors hover:bg-muted"
            aria-label="Scroll tabs left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </>
      )}

      {/* Right fade + arrow */}
      {canScrollRight && (
        <>
          <div className="pointer-events-none absolute right-0 top-0 bottom-px z-10 w-12 bg-gradient-to-l from-background to-transparent" />
          <button
            type="button"
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 z-20 -translate-y-1/2 rounded-full border bg-background p-1 shadow-sm transition-colors hover:bg-muted"
            aria-label="Scroll tabs right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </>
      )}

      <nav
        ref={navRef}
        className="-mb-px flex gap-1 overflow-x-auto pb-px"
        style={{ scrollbarWidth: "none" }}
      >
        {tabs.map((tab) => {
          const isActive = tab.href === pathname;
          const Icon = iconMap[tab.icon];
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "group relative flex items-center gap-2 whitespace-nowrap rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {tab.label}
              {isActive && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>
      <div className="absolute inset-x-0 bottom-0 h-px bg-border" />
    </div>
  );
}

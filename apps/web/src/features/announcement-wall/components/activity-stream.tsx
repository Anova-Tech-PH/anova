"use client";

import { Megaphone, Clock, Star, BarChart2, Palette, MapPin } from "lucide-react";
import type { FeedItem } from "../lib/build-feed-items";

type ActivityStreamProps = {
  items: FeedItem[];
  mode: "full" | "embed";
  theme: "dark" | "light";
  eventTitle: string;
};

const FEED_ICONS: Record<FeedItem["type"], React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  announcement: Megaphone,
  session: Clock,
  sponsor: Star,
  poll: BarChart2,
  custom: Palette,
};

const TYPE_LABELS: Record<FeedItem["type"], string> = {
  announcement: "Announcement",
  session: "Upcoming Session",
  sponsor: "Sponsor",
  poll: "Live Poll",
  custom: "",
};

export default function ActivityStream({
  items,
  mode,
  theme,
  eventTitle,
}: ActivityStreamProps) {
  const isDark = theme === "dark";
  const baseBg = isDark ? "bg-slate-900" : "bg-gray-50";
  const baseText = isDark ? "text-white" : "text-slate-900";
  const cardBg = isDark ? "bg-slate-800" : "bg-white";
  const cardBorder = isDark ? "border-slate-700" : "border-gray-200";
  const mutedText = isDark ? "text-slate-400" : "text-slate-500";

  const isEmbed = mode === "embed";

  if (items.length === 0) {
    return (
      <div className={`flex h-full min-h-[300px] items-center justify-center ${baseBg} ${baseText}`}>
        <p className={`text-lg ${mutedText}`}>No activity yet</p>
      </div>
    );
  }

  return (
    <div className={`flex h-full flex-col ${baseBg} ${baseText}`}>
      {/* Header — full mode only */}
      {!isEmbed && (
        <div className={`sticky top-0 z-10 border-b px-6 py-4 ${cardBg} ${cardBorder}`}>
          <h1 className="text-xl font-bold">{eventTitle}</h1>
          <p className={`text-sm ${mutedText}`}>What&apos;s going on</p>
        </div>
      )}

      {/* Embed header — compact */}
      {isEmbed && (
        <div className={`sticky top-0 z-10 border-b px-4 py-3 ${cardBg} ${cardBorder}`}>
          <p className="text-sm font-semibold">What&apos;s going on</p>
        </div>
      )}

      {/* Feed cards */}
      <div className={`flex-1 overflow-y-auto ${isEmbed ? "px-3 py-2" : "px-6 py-4"}`}>
        <div className={`space-y-${isEmbed ? "2" : "3"}`}>
          {items.map((item) => {
            const Icon = FEED_ICONS[item.type];
            const label = TYPE_LABELS[item.type];

            return (
              <div
                key={`${item.type}-${item.id}`}
                className={`rounded-lg border ${cardBg} ${cardBorder} ${
                  isEmbed ? "p-3" : "p-4"
                }`}
                style={
                  item.type === "custom" && item.bgColor
                    ? { borderLeftColor: item.bgColor, borderLeftWidth: 4 }
                    : undefined
                }
              >
                {/* Type label */}
                {label && (
                  <div className={`mb-1 flex items-center gap-1.5 ${mutedText}`}>
                    <Icon className={`${isEmbed ? "h-3 w-3" : "h-3.5 w-3.5"}`} />
                    <span className={`${isEmbed ? "text-[10px]" : "text-xs"} font-medium uppercase tracking-wide`}>
                      {label}
                    </span>
                  </div>
                )}

                {/* Title */}
                <h3 className={`font-semibold ${isEmbed ? "text-sm" : "text-base"}`}>
                  {item.title}
                </h3>

                {/* Body */}
                {item.body && (
                  <p className={`mt-1 ${mutedText} ${isEmbed ? "text-xs" : "text-sm"} line-clamp-3`}>
                    {item.body}
                  </p>
                )}

                {/* Speakers */}
                {item.speakers && item.speakers.length > 0 && (
                  <p className={`mt-1 ${mutedText} ${isEmbed ? "text-xs" : "text-sm"}`}>
                    {item.speakers.join(" · ")}
                  </p>
                )}

                {/* Meta (location, tier) */}
                {item.meta && (
                  <div className={`mt-1 flex items-center gap-1 ${mutedText}`}>
                    <MapPin className="h-3 w-3" />
                    <span className={`${isEmbed ? "text-xs" : "text-sm"}`}>{item.meta}</span>
                  </div>
                )}

                {/* Sponsor logo */}
                {item.type === "sponsor" && item.logoUrl && (
                  <img
                    src={item.logoUrl}
                    alt={item.title}
                    className="mt-2 max-h-12 max-w-[120px] object-contain"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer — full mode only */}
      {!isEmbed && (
        <div className={`border-t px-6 py-3 text-center ${cardBorder}`}>
          <span className={`text-xs ${mutedText}`}>Powered by Evenstry</span>
        </div>
      )}
    </div>
  );
}

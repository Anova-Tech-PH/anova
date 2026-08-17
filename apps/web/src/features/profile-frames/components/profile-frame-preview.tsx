"use client";

import { User } from "lucide-react";

interface ProfileFramePreviewProps {
  label: string;
  color: string;
  size?: "sm" | "md";
}

export function ProfileFramePreview({ label, color, size = "sm" }: ProfileFramePreviewProps) {
  const dimensions = size === "sm" ? "h-20 w-20" : "h-32 w-32";
  const ringWidth = size === "sm" ? 3 : 5;
  const avatarDimensions = size === "sm" ? "h-14 w-14" : "h-22 w-22";
  const iconSize = size === "sm" ? "h-6 w-6" : "h-10 w-10";
  const badgeFontSize = size === "sm" ? "text-[8px]" : "text-[11px]";
  const badgePadding = size === "sm" ? "px-1.5 py-0.5" : "px-2 py-0.5";

  return (
    <div className={`relative flex flex-col items-center ${dimensions}`}>
      {/* Colored ring around avatar */}
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          border: `${ringWidth}px solid ${color}`,
          width: size === "sm" ? 56 : 88,
          height: size === "sm" ? 56 : 88,
        }}
      >
        {/* Gray circle avatar placeholder */}
        <div
          className={`${avatarDimensions} flex items-center justify-center rounded-full bg-muted`}
        >
          <User className={`${iconSize} text-muted-foreground/40`} />
        </div>
      </div>

      {/* Label badge below avatar */}
      {label && (
        <span
          className={`absolute -bottom-1 rounded-full font-semibold text-white ${badgeFontSize} ${badgePadding}`}
          style={{ backgroundColor: color }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

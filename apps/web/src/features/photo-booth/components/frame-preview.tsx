"use client";

import { ImageIcon } from "lucide-react";

interface FramePreviewProps {
  template: "banner_top" | "banner_bottom" | "corner" | "border";
  message: string;
  color: string;
  size?: "sm" | "md";
}

export function FramePreview({ template, message, color, size = "sm" }: FramePreviewProps) {
  const dimensions = size === "sm" ? "h-24 w-24" : "h-40 w-40";
  const fontSize = size === "sm" ? "text-[7px]" : "text-[10px]";
  const bannerPadding = size === "sm" ? "px-1 py-0.5" : "px-2 py-1";
  const cornerPadding = size === "sm" ? "px-1 py-0.5" : "px-1.5 py-0.5";
  const borderWidth = size === "sm" ? 3 : 5;

  return (
    <div
      className={`relative ${dimensions} overflow-hidden rounded-md bg-muted`}
      style={template === "border" ? { border: `${borderWidth}px solid ${color}` } : undefined}
    >
      {/* Placeholder image area */}
      <div className="flex h-full w-full items-center justify-center">
        <ImageIcon className="h-1/3 w-1/3 text-muted-foreground/30" />
      </div>

      {/* Banner Top */}
      {template === "banner_top" && (
        <div
          className={`absolute inset-x-0 top-0 truncate text-center font-semibold text-white ${fontSize} ${bannerPadding}`}
          style={{ backgroundColor: color }}
        >
          {message || "Message"}
        </div>
      )}

      {/* Banner Bottom */}
      {template === "banner_bottom" && (
        <div
          className={`absolute inset-x-0 bottom-0 truncate text-center font-semibold text-white ${fontSize} ${bannerPadding}`}
          style={{ backgroundColor: color }}
        >
          {message || "Message"}
        </div>
      )}

      {/* Corner Badge */}
      {template === "corner" && (
        <div
          className={`absolute right-0 top-0 truncate rounded-bl font-semibold text-white ${fontSize} ${cornerPadding}`}
          style={{ backgroundColor: color }}
        >
          {message || "Msg"}
        </div>
      )}

      {/* Full Border - message on bottom overlay */}
      {template === "border" && message && (
        <div
          className={`absolute inset-x-0 bottom-0 truncate text-center font-semibold text-white ${fontSize} ${bannerPadding}`}
          style={{ backgroundColor: color }}
        >
          {message}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { User } from "lucide-react";
import { cn } from "../../utils/cn";

const sizes = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
};

const avatarColors = [
  "bg-primary/15 text-primary",
  "bg-success-light text-success",
  "bg-info-light text-info",
  "bg-warning-light text-warning",
  "bg-destructive/10 text-destructive",
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  ring?: boolean;
  frame?: { color: string; label: string } | null;
}

export function Avatar({ src, name, size = "md", className, ring, frame }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const sizeClass = sizes[size];
  const colorClass = name ? avatarColors[hashName(name) % avatarColors.length] : avatarColors[0];
  const ringClass = ring ? "ring-2 ring-background shadow-sm" : "";

  let avatarElement: React.ReactNode;

  if (src && !imgError) {
    avatarElement = (
      <img
        src={src}
        alt={name || "Avatar"}
        onError={() => setImgError(true)}
        className={cn("shrink-0 rounded-full object-cover", sizeClass, ringClass, className)}
        style={frame ? { border: `3px solid ${frame.color}` } : undefined}
      />
    );
  } else if (name) {
    avatarElement = (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full font-medium",
          sizeClass,
          colorClass,
          ringClass,
          className
        )}
        style={frame ? { border: `3px solid ${frame.color}` } : undefined}
      >
        {getInitials(name)}
      </div>
    );
  } else {
    avatarElement = (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground",
          sizeClass,
          ringClass,
          className
        )}
        style={frame ? { border: `3px solid ${frame.color}` } : undefined}
      >
        <User className="h-1/2 w-1/2" />
      </div>
    );
  }

  if (!frame) return avatarElement;

  return (
    <div className="relative inline-flex flex-col items-center">
      {avatarElement}
      <span
        className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[8px] font-semibold text-white"
        style={{ backgroundColor: frame.color }}
      >
        {frame.label}
      </span>
    </div>
  );
}

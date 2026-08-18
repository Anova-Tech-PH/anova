"use client";

import { useState } from "react";
import { cn } from "../utils/cn";

interface LogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "color" | "white";
  className?: string;
}

const sizes = {
  xs: { width: 90, height: 28 },
  sm: { width: 120, height: 40 },
  md: { width: 150, height: 48 },
  lg: { width: 200, height: 64 },
  xl: { width: 360, height: 120 },
};

const fontSizes = {
  xs: "text-base",
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
  xl: "text-4xl",
};

const iconSizes = {
  xs: "h-4 w-4",
  sm: "h-5 w-5",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
};

function SvgFallback({ size, variant, className }: LogoProps) {
  const textColor = variant === "white" ? "text-white" : "text-primary";
  const accentColor = variant === "white" ? "text-white/70" : "text-primary/70";

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <svg viewBox="0 0 24 24" fill="none" className={cn(iconSizes[size!], textColor)}>
        <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3 9h18" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8.5 14l2 2 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className={cn("font-bold tracking-tight font-serif", fontSizes[size!], textColor)}>
        even<span className={accentColor}>triv</span>
      </span>
    </div>
  );
}

export function Logo({ size = "md", variant = "color", className }: LogoProps) {
  const [imgError, setImgError] = useState(false);
  const { width, height } = sizes[size];

  if (imgError) {
    return <SvgFallback size={size} variant={variant} className={className} />;
  }

  const svgSrc = variant === "white" ? "/logo-white.svg" : "/logo.svg";
  const pngSrc = variant === "white" ? "/logo-white.png" : "/logo.png";

  return (
    <picture>
      <source srcSet={svgSrc} type="image/svg+xml" />
      <img
        src={pngSrc}
        alt="Eventriv"
        width={width}
        height={height}
        className={cn("block object-contain", className)}
        onError={() => setImgError(true)}
      />
    </picture>
  );
}

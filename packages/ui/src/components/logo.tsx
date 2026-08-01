import { cn } from "../utils/cn";

interface LogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "color" | "white";
  className?: string;
}

const fontSizes = {
  xs: "text-lg",
  sm: "text-xl",
  md: "text-2xl",
  lg: "text-3xl",
  xl: "text-5xl",
};

const iconSizes = {
  xs: "h-4 w-4",
  sm: "h-5 w-5",
  md: "h-6 w-6",
  lg: "h-7 w-7",
  xl: "h-10 w-10",
};

export function Logo({ size = "md", variant = "color", className }: LogoProps) {
  const textColor = variant === "white" ? "text-white" : "text-primary";
  const accentColor = variant === "white" ? "text-white/70" : "text-primary/70";

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={cn(iconSizes[size], textColor)}
      >
        <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M3 9h18" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M8.5 14l2 2 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className={cn("font-bold tracking-tight font-serif", fontSizes[size], textColor)}>
        even<span className={accentColor}>stry</span>
      </span>
    </div>
  );
}

import { cn } from "../utils/cn";

interface LogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "color" | "white";
  className?: string;
}

const fontSizes = {
  xs: "text-[14px]",
  sm: "text-[16px]",
  md: "text-[19px]",
  lg: "text-[22px]",
  xl: "text-[28px]",
};

export function Logo({ size = "md", variant = "color", className }: LogoProps) {
  const textColor = variant === "white" ? "text-white" : "text-ink";

  return (
    <span
      className={cn(
        "font-display font-extrabold uppercase tracking-[-0.03em]",
        fontSizes[size],
        textColor,
        className
      )}
    >
      EVENSTRY
    </span>
  );
}

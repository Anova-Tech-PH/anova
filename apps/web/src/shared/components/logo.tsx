import { cn } from "@/shared/utils/cn";

interface LogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "color" | "white";
  className?: string;
}

const sizes = {
  xs: { width: 72, height: 28 },
  sm: { width: 100, height: 40 },
  md: { width: 120, height: 48 },
  lg: { width: 160, height: 64 },
  xl: { width: 300, height: 120 },
};

export function Logo({ size = "md", variant = "color", className }: LogoProps) {
  const { width, height } = sizes[size];
  return (
    <img
      src={variant === "white" ? "/logo-white.png" : "/logo.png"}
      alt="Anova"
      width={width}
      height={height}
      className={cn("block object-contain", className)}
    />
  );
}

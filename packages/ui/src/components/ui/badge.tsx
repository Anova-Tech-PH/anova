import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../utils/cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-[4px] px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.04em] transition-colors",
  {
    variants: {
      variant: {
        default: "bg-secondary text-muted-foreground",
        primary: "bg-primary/10 text-primary",
        success: "bg-success-bg text-success",
        warning: "bg-warning-bg text-warning",
        destructive: "bg-destructive/10 text-destructive",
        info: "bg-accent/20 text-accent-ink",
        outline: "border border-border text-muted-foreground",
        live: "bg-primary text-primary-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />;
}

export { Badge, badgeVariants };

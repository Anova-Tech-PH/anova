import { forwardRef } from "react";
import { cn } from "../../utils/cn";

const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        className={cn(
          "w-full rounded-[6px] border-[1.5px] border-border bg-card px-3 py-[13px] text-[15px] font-semibold transition-all duration-150 outline-none placeholder:text-muted-foreground/50 placeholder:font-medium hover:border-ring/40 focus:border-primary focus:ring-[3px] focus:ring-primary/12",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "w-full rounded-[6px] border-[1.5px] border-border bg-card px-3 py-[13px] text-[15px] font-semibold transition-all duration-150 outline-none placeholder:text-muted-foreground/50 placeholder:font-medium hover:border-ring/40 focus:border-primary focus:ring-[3px] focus:ring-primary/12",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Input, Textarea };

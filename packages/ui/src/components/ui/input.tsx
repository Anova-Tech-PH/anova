import { forwardRef } from "react";
import { cn } from "../../utils/cn";

const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        className={cn(
          "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-all duration-200 outline-none placeholder:text-muted-foreground/50 hover:border-ring/40 focus:border-ring focus:ring-2 focus:ring-ring/20 focus:shadow-[0_0_0_3px_rgba(139,61,255,0.12)]",
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
          "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-all duration-200 outline-none placeholder:text-muted-foreground/50 hover:border-ring/40 focus:border-ring focus:ring-2 focus:ring-ring/20 focus:shadow-[0_0_0_3px_rgba(139,61,255,0.12)]",
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

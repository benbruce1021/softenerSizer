import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, inputMode, onWheel, ...props }, ref) => {
    return (
      <input
        type={type}
        inputMode={inputMode ?? (type === "number" ? "decimal" : undefined)}
        onWheel={(event) => {
          if (type === "number") {
            event.currentTarget.blur();
          }
          onWheel?.(event);
        }}
        className={cn(
          "flex h-11 w-full rounded-lg border border-input bg-white/90 px-3 py-2 text-base shadow-sm transition-[border-color,box-shadow,background-color] duration-150 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/75 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };

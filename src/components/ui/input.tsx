import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-11 w-full rounded-sm bg-bg px-3 font-sans text-sm text-fg shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-accent)_22%,transparent)] transition-[box-shadow] duration-150 ease-out placeholder:text-dim focus-visible:outline-none focus-visible:shadow-[inset_0_0_0_1px_var(--color-accent),0_0_12px_color-mix(in_oklab,var(--color-accent)_25%,transparent)] disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };

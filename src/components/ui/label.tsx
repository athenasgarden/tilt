import * as React from "react";
import { cn } from "@/lib/utils";

const Label = React.forwardRef<HTMLLabelElement, React.ComponentProps<"label">>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("font-display text-xs font-medium tracking-hud text-muted uppercase", className)}
      {...props}
    />
  ),
);
Label.displayName = "Label";

export { Label };

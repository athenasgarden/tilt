import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-[color,background-color,box-shadow,transform,opacity] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-40 active:not-disabled:scale-[0.96] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-fg hover:bg-accent/90",
        coin: "bg-accent text-accent-fg font-display tracking-hud uppercase shadow-[0_3px_0_color-mix(in_oklab,var(--color-accent-fg)_70%,black),0_0_22px_color-mix(in_oklab,var(--color-accent)_45%,transparent)] hover:bg-accent/90 active:not-disabled:translate-y-px",
        outline:
          "bg-transparent text-fg shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--color-accent)_28%,transparent)] hover:text-accent",
        ghost: "bg-transparent text-muted hover:text-accent",
        danger: "bg-danger text-danger-fg hover:bg-danger/90",
      },
      size: {
        default: "h-11 rounded-sm px-4 text-sm",
        sm: "h-10 rounded-sm px-3 text-xs",
        lg: "h-14 rounded-sm px-5 text-sm",
        icon: "size-11 rounded-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

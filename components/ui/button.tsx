import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl text-sm font-semibold tracking-[0.01em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[linear-gradient(135deg,#0b5f73,#083d4c)] text-primary-foreground shadow-[0_14px_28px_rgba(8,61,76,0.22)] hover:-translate-y-0.5 hover:shadow-[0_18px_32px_rgba(8,61,76,0.26)]",
        outline:
          "border border-slate-200 bg-white/92 text-slate-800 shadow-sm hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md",
        secondary:
          "bg-[linear-gradient(135deg,#efe2bf,#f6ecd4)] text-secondary-foreground shadow-sm hover:-translate-y-0.5 hover:shadow-md",
        destructive:
          "bg-[linear-gradient(135deg,hsl(var(--destructive)),#991b1b)] text-destructive-foreground shadow-[0_12px_24px_rgba(190,24,93,0.18)] hover:-translate-y-0.5 hover:shadow-[0_16px_28px_rgba(190,24,93,0.22)]",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 rounded-lg px-3 text-[13px]",
        lg: "h-12 rounded-xl px-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

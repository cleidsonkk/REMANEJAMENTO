import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl text-sm font-medium tracking-[0.01em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[linear-gradient(135deg,hsl(var(--primary)),#0f3f4b)] text-primary-foreground shadow-[0_12px_24px_rgba(15,118,110,0.18)] hover:-translate-y-0.5 hover:shadow-[0_16px_28px_rgba(15,118,110,0.22)]",
        outline:
          "border border-slate-200 bg-white/88 text-slate-800 shadow-sm hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md",
        secondary:
          "bg-[linear-gradient(135deg,#f4e7c8,#f7edd5)] text-secondary-foreground shadow-sm hover:-translate-y-0.5 hover:shadow-md",
        destructive:
          "bg-[linear-gradient(135deg,hsl(var(--destructive)),#991b1b)] text-destructive-foreground shadow-[0_12px_24px_rgba(190,24,93,0.18)] hover:-translate-y-0.5 hover:shadow-[0_16px_28px_rgba(190,24,93,0.22)]",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-9 rounded-lg px-3",
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

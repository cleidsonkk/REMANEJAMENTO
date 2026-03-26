import { cn } from "@/lib/utils";

const variants = {
  neutral: "bg-muted text-foreground",
  success: "bg-emerald-100 text-emerald-800",
  warning: "bg-amber-100 text-amber-900",
  danger: "bg-rose-100 text-rose-800",
};

export function Badge({
  className,
  variant = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof variants }) {
  return (
    <span
      className={cn("inline-flex rounded-full px-3 py-1 text-xs font-semibold", variants[variant], className)}
      {...props}
    />
  );
}

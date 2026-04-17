import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  aside,
  className,
}: {
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "panel-dark relative min-w-0 overflow-hidden p-6 md:p-8",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.07),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(217,119,6,0.08),transparent_18%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),transparent)]" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr),minmax(280px,0.82fr)] xl:items-end">
        <div className="relative min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.28em] text-slate-200">
            <span className="h-2 w-2 rounded-full bg-amber-300" />
            {eyebrow}
          </div>
          <h1
            className="mt-5 max-w-4xl text-3xl font-semibold leading-[1.02] text-white md:text-[3.1rem]"
            data-display="true"
          >
            {title}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200 md:text-[15px]">{description}</p>
        </div>
        {aside ? (
          <div className="panel-dark-soft relative min-w-0 p-5">
            {aside}
          </div>
        ) : null}
      </div>
    </section>
  );
}

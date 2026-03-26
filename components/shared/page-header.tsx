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
        "relative min-w-0 overflow-hidden rounded-[2.25rem] border border-slate-900/80 bg-[linear-gradient(145deg,rgba(4,16,32,0.99),rgba(9,30,52,0.99)_42%,rgba(12,48,70,0.98)_100%)] p-6 text-white shadow-glow md:p-8",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.08),transparent_20%)]" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr),minmax(300px,0.75fr)] xl:items-end">
        <div className="relative min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] uppercase tracking-[0.28em] text-slate-200">
            <span className="h-2 w-2 rounded-full bg-emerald-300" />
            {eyebrow}
          </div>
          <h1 className="mt-5 max-w-4xl text-3xl font-semibold leading-[1.02] tracking-[-0.04em] text-white md:text-5xl">
            {title}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200 md:text-[15px]">{description}</p>
        </div>
        {aside ? (
          <div className="relative min-w-0 rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] p-5 backdrop-blur">
            {aside}
          </div>
        ) : null}
      </div>
    </section>
  );
}

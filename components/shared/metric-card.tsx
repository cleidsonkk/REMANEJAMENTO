import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export function MetricCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: ReactNode;
  hint: string;
  href?: string;
}) {
  return (
    <Card className="min-w-0 border-slate-900/70 bg-[linear-gradient(145deg,rgba(5,18,34,0.98),rgba(10,32,54,0.98)_52%,rgba(12,48,70,0.96))] text-white">
      <div className="flex items-start justify-between gap-4">
        <CardDescription className="min-w-0 text-xs uppercase tracking-[0.25em] text-slate-300">{label}</CardDescription>
        {href ? (
          <Link
            aria-label={`Abrir ${label}`}
            className="shrink-0 flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white transition hover:-translate-y-0.5 hover:bg-white/16"
            href={href}
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        )}
      </div>
      <CardTitle className="mt-5 break-words text-3xl text-white md:text-[2.6rem]">{value}</CardTitle>
      <div className="mt-4 h-px bg-[linear-gradient(90deg,rgba(255,255,255,0.12),rgba(255,255,255,0.24),transparent)]" />
      <p className="mt-4 text-sm leading-6 text-slate-200">{hint}</p>
    </Card>
  );
}

import type { ReactNode } from "react";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export function SimpleFormCard({
  title,
  description,
  children,
  className,
  tone = "dark",
}: {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
  tone?: "dark" | "light";
}) {
  const isLight = tone === "light";

  return (
    <Card
      className={
        className
          ? `${isLight ? "border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,245,240,0.95))] text-slate-950" : "border-slate-900/70 bg-[linear-gradient(145deg,rgba(5,18,34,0.98),rgba(10,32,54,0.98)_52%,rgba(12,48,70,0.96))] text-white"} ${className}`
          : isLight
            ? "border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,245,240,0.95))] text-slate-950"
            : "border-slate-900/70 bg-[linear-gradient(145deg,rgba(5,18,34,0.98),rgba(10,32,54,0.98)_52%,rgba(12,48,70,0.96))] text-white"
      }
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <CardTitle className={`text-[1.35rem] ${isLight ? "text-slate-950" : "text-white"}`}>{title}</CardTitle>
          <CardDescription className={`mt-2 max-w-2xl leading-7 ${isLight ? "text-slate-600" : "text-slate-200"}`}>{description}</CardDescription>
        </div>
        <span className={`hidden h-11 w-11 items-center justify-center rounded-2xl shadow-sm lg:flex ${isLight ? "border border-slate-200 bg-white text-slate-950" : "border border-white/10 bg-white/10 text-white"}`}>
          <span className={`h-2.5 w-2.5 rounded-full ${isLight ? "bg-teal-600" : "bg-amber-300"}`} />
        </span>
      </div>
      <div className={`mt-6 h-px ${isLight ? "bg-[linear-gradient(90deg,rgba(148,163,184,0.12),rgba(15,23,42,0.14),transparent)]" : "bg-[linear-gradient(90deg,rgba(255,255,255,0.08),rgba(255,255,255,0.22),transparent)]"}`} />
      <div className="mt-6">{children}</div>
    </Card>
  );
}

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
      className={`${isLight ? "panel-light text-slate-950" : "panel-dark text-white"} ${className ?? ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <CardTitle className={`text-[1.35rem] ${isLight ? "text-slate-950" : "text-white"}`}>{title}</CardTitle>
          <CardDescription className={`mt-2 max-w-2xl leading-7 ${isLight ? "text-slate-600" : "text-slate-200"}`}>
            {description}
          </CardDescription>
        </div>
        <span
          className={`hidden h-11 w-11 items-center justify-center rounded-2xl shadow-sm lg:flex ${isLight ? "border border-slate-200 bg-white text-slate-950" : "border border-white/10 bg-white/10 text-white"}`}
        >
          <span className={`h-2.5 w-2.5 rounded-full ${isLight ? "bg-teal-700" : "bg-amber-300"}`} />
        </span>
      </div>
      <div
        className={`mt-6 h-px ${isLight ? "bg-[linear-gradient(90deg,rgba(148,163,184,0.12),rgba(15,23,42,0.14),transparent)]" : "bg-[linear-gradient(90deg,rgba(255,255,255,0.08),rgba(255,255,255,0.22),transparent)]"}`}
      />
      <div className="mt-6">{children}</div>
    </Card>
  );
}

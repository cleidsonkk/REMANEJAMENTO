import { CircleAlert } from "lucide-react";

export function SectionNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(245,243,237,0.85))] px-4 py-3 text-sm text-muted-foreground">
      <CircleAlert className="mt-0.5 h-4 w-4 text-primary" />
      <div className="leading-6">{children}</div>
    </div>
  );
}

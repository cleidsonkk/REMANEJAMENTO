import { CircleAlert } from "lucide-react";

export function SectionNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border bg-muted/35 px-4 py-3 text-sm text-muted-foreground">
      <CircleAlert className="mt-0.5 h-4 w-4 text-primary" />
      <div className="leading-6">{children}</div>
    </div>
  );
}

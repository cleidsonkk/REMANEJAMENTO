"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, FileClock, LayoutDashboard, ScrollText, Search, Shield, Users } from "lucide-react";

import { cn } from "@/lib/utils";

type IconName = "dashboard" | "remanejamentos" | "secretarias" | "usuarios" | "executados" | "auditoria" | "busca";

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
};

type SidebarNavProps = {
  items: NavItem[];
  mode?: "mobile" | "desktop";
};

const iconMap: Record<IconName, ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  remanejamentos: FileClock,
  secretarias: Building2,
  usuarios: Users,
  executados: ScrollText,
  auditoria: Shield,
  busca: Search,
};

export function SidebarNav({ items, mode = "desktop" }: SidebarNavProps) {
  const pathname = usePathname();
  const isMobile = mode === "mobile";

  return (
    <nav
      className={cn(
        "mt-6 min-w-0",
        isMobile ? "grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2" : "grid gap-2",
      )}
    >
      {items.map((item) => {
        const Icon = iconMap[item.icon];
        const isDashboardRoot = item.href === "/dashboard";
        const isActive = isDashboardRoot ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group min-w-0 overflow-hidden rounded-2xl border transition-all",
              isMobile
                ? "flex min-h-[78px] flex-col items-start justify-center gap-2 px-3 py-3 backdrop-blur-sm"
                : "flex items-center gap-3 px-4 py-3.5 text-sm",
              isActive
                ? "border-white/20 bg-white text-slate-950 shadow-lg"
                : isMobile
                  ? "border-white/12 bg-slate-800 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-white/20 hover:bg-slate-700/95"
                  : "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] text-slate-50 hover:border-white/18 hover:bg-white/12",
            )}
          >
            <span
              className={cn(
                "flex items-center justify-center rounded-xl transition-colors",
                isMobile ? "h-9 w-9" : "h-9 w-9",
                isActive ? "bg-slate-950 text-white" : "bg-white/12 text-slate-100 group-hover:bg-white/18",
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span
              className={cn(
                "min-w-0 font-medium",
                isMobile ? "text-xs leading-4 break-words" : "truncate text-sm leading-5",
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

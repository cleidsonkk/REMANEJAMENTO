import { Landmark } from "lucide-react";

import { logoutAction } from "@/app/actions/auth-actions";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type AppShellProps = {
  children: React.ReactNode;
  role: "ADMIN_PLANEJAMENTO" | "USUARIO_SECRETARIA";
  userName: string;
};

export function AppShell({ children, role, userName }: AppShellProps) {
  const commonLinks = [
    { href: "/dashboard", label: "Visão geral", icon: "dashboard" as const },
    { href: "/dashboard/remanejamentos", label: "Remanejamentos", icon: "remanejamentos" as const },
  ];

  const adminLinks = [
    { href: "/dashboard/busca", label: "Busca global", icon: "busca" as const },
    { href: "/dashboard/admin/secretarias", label: "Secretarias", icon: "secretarias" as const },
    { href: "/dashboard/admin/usuarios", label: "Usuários", icon: "usuarios" as const },
    { href: "/dashboard/executados", label: "Executados", icon: "executados" as const },
    { href: "/dashboard/auditoria", label: "Auditoria", icon: "auditoria" as const },
  ];

  const links = role === "ADMIN_PLANEJAMENTO" ? [...commonLinks, ...adminLinks] : commonLinks;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.08),transparent_18%),radial-gradient(circle_at_92%_16%,rgba(217,119,6,0.08),transparent_18%),linear-gradient(180deg,rgba(247,244,237,0.84),rgba(241,236,227,0.9))]">
      <div className="mx-auto max-w-[1720px] px-4 py-4 lg:px-6 lg:py-6">
        <div className="space-y-4 pb-8 lg:hidden">
          <section className="rounded-[2rem] border border-slate-900/80 bg-[linear-gradient(180deg,rgba(4,11,22,0.98),rgba(11,25,45,0.98))] p-5 text-white shadow-glow">
            <div className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] p-4">
              <div className="flex items-center justify-between gap-4">
                <Badge className="bg-white/10 px-3 py-1 text-white" variant="neutral">
                  Prefeitura de Umbaúba
                </Badge>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-400/90 text-slate-950">
                  <Landmark className="h-5 w-5" />
                </span>
              </div>
              <div className="mt-4 min-w-0">
                <h1 className="text-2xl font-semibold leading-tight">Remanejamento Orçamentário</h1>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Controle institucional com fluxo multiusuário, auditoria completa e rastreabilidade por secretaria.
                </p>
              </div>
            </div>

            <div className="mt-5 min-w-0 rounded-[1.5rem] border border-white/10 bg-slate-950/25 p-3">
              <SidebarNav items={links} mode="mobile" />
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-900/80 bg-[linear-gradient(180deg,rgba(4,11,22,0.98),rgba(11,25,45,0.98))] p-5 text-white shadow-glow">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Sessão ativa</p>
            <p className="mt-3 break-words text-lg font-semibold">{userName}</p>
            <p className="mt-1 text-sm text-slate-300">
              {role === "ADMIN_PLANEJAMENTO" ? "Administrador de planejamento" : "Usuário de secretaria"}
            </p>
            <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-slate-300">
              Ambiente preparado para operação simultânea com controle de acesso por papel e trilha de auditoria.
            </p>
            <form action={logoutAction} className="mt-5">
              <Button className="w-full bg-white text-slate-950 hover:bg-slate-100" type="submit">
                Encerrar sessão
              </Button>
            </form>
          </section>

          <main className="min-w-0 space-y-6">{children}</main>
        </div>

        <div className="hidden lg:grid lg:min-h-screen lg:grid-cols-[340px,minmax(0,1fr)] lg:gap-7">
          <aside className="min-w-0 self-start rounded-[2.2rem] border border-slate-900/80 bg-[linear-gradient(180deg,rgba(4,11,22,0.99),rgba(10,22,40,0.99)_48%,rgba(13,34,56,0.98)_100%)] p-5 text-white shadow-glow">
            <div className="flex h-full min-w-0 flex-col">
              <div className="rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-5">
                <div className="flex items-center justify-between gap-4">
                  <Badge className="bg-white/10 px-3 py-1 text-white" variant="neutral">
                    Prefeitura de Umbaúba
                  </Badge>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-400/90 text-slate-950">
                    <Landmark className="h-5 w-5" />
                  </span>
                </div>
                <div className="mt-5 min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-slate-300">Ambiente institucional</p>
                  <h1 className="mt-3 text-[2rem] font-semibold leading-[1.02] tracking-[-0.04em]">
                    Remanejamento Orçamentário
                  </h1>
                  <p className="mt-3 text-sm leading-7 text-slate-200">
                    Controle institucional com fluxo multiusuário, auditoria completa e rastreabilidade por secretaria.
                  </p>
                </div>
              </div>

              <SidebarNav items={links} mode="desktop" />

              <div className="mt-6 rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Sessão ativa</p>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-emerald-200">
                    Online
                  </span>
                </div>
                <p className="mt-4 break-words text-lg font-semibold">{userName}</p>
                <p className="mt-1 text-sm text-slate-300">
                  {role === "ADMIN_PLANEJAMENTO" ? "Administrador de planejamento" : "Usuário de secretaria"}
                </p>
                <p className="mt-5 rounded-2xl border border-white/10 bg-slate-950/25 px-4 py-3 text-sm leading-7 text-slate-300">
                  Ambiente preparado para operação simultânea com controle de acesso por papel e trilha de auditoria.
                </p>
                <form action={logoutAction} className="mt-5">
                  <Button className="w-full bg-white text-slate-950 hover:bg-slate-100" type="submit" variant="outline">
                    Encerrar sessão
                  </Button>
                </form>
              </div>
            </div>
          </aside>

          <main className="layout-shell min-w-0 overflow-hidden p-4">
            <div className="min-w-0 space-y-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

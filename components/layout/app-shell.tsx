import Link from "next/link";
import { BellRing, Landmark } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

import { logoutAction } from "@/app/actions/auth-actions";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type NotificationListItem, getNotificationHref } from "@/services/notification.service";

type AppShellProps = {
  children: React.ReactNode;
  role: "ADMIN_PLANEJAMENTO" | "USUARIO_SECRETARIA";
  userName: string;
  notifications: NotificationListItem[];
  unreadNotifications: number;
};

function formatUnreadBadge(value: number) {
  if (value <= 0) {
    return null;
  }

  return value > 99 ? "99+" : String(value);
}

function NotificationPreview({
  notifications,
  unreadNotifications,
}: {
  notifications: NotificationListItem[];
  unreadNotifications: number;
}) {
  const unreadBadge = formatUnreadBadge(unreadNotifications);

  return (
    <div className="panel-dark-soft mt-6 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Notificações</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Centro interno de avisos para solicitações recebidas e confirmações de execução.
          </p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white">
          <BellRing className="h-5 w-5" />
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-white">
          {unreadNotifications ? `${unreadNotifications} não lidas` : "Sem pendências de leitura"}
        </p>
        {unreadBadge ? (
          <span className="rounded-full bg-amber-400/90 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-950">
            {unreadBadge}
          </span>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        {notifications.length ? (
          notifications.slice(0, 3).map((notification) => (
            <Link
              key={notification.id}
              className={cn(
                "block rounded-2xl border px-4 py-3 transition hover:bg-white/8",
                notification.isRead ? "border-white/8 bg-slate-950/18" : "border-amber-300/18 bg-white/10",
              )}
              href={getNotificationHref(notification)}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 text-sm font-semibold text-white">{notification.title}</p>
                {!notification.isRead ? (
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-300" />
                ) : null}
              </div>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-300">{notification.message}</p>
              <p className="mt-2 text-xs text-slate-400">
                {formatDistanceToNow(notification.createdAt, { addSuffix: true, locale: ptBR })}
              </p>
            </Link>
          ))
        ) : (
          <div className="rounded-2xl border border-white/8 bg-slate-950/18 px-4 py-4 text-sm leading-6 text-slate-300">
            Nenhuma notificação registrada até o momento.
          </div>
        )}
      </div>

      <Link href="/dashboard/notificacoes">
        <Button className="mt-4 w-full bg-white text-slate-950 hover:bg-slate-100" type="button" variant="outline">
          Abrir central de notificações
        </Button>
      </Link>
    </div>
  );
}

export function AppShell({ children, role, userName, notifications, unreadNotifications }: AppShellProps) {
  const unreadBadge = formatUnreadBadge(unreadNotifications);

  const commonLinks = [
    { href: "/dashboard", label: "Visão geral", icon: "dashboard" as const },
    { href: "/dashboard/remanejamentos", label: "Remanejamentos", icon: "remanejamentos" as const },
    {
      href: "/dashboard/notificacoes",
      label: "Notificações",
      icon: "notificacoes" as const,
      badge: unreadBadge,
    },
  ];

  const adminLinks = [
    { href: "/dashboard/busca", label: "Busca global", icon: "busca" as const },
    { href: "/dashboard/admin/secretarias", label: "Secretarias", icon: "secretarias" as const },
    { href: "/dashboard/admin/usuarios", label: "Usuários", icon: "usuarios" as const },
    { href: "/dashboard/executados", label: "Executados", icon: "executados" as const },
    { href: "/dashboard/auditoria", label: "Auditoria", icon: "auditoria" as const },
    { href: "/dashboard/saude", label: "Saude", icon: "saude" as const },
  ];

  const links = role === "ADMIN_PLANEJAMENTO" ? [...commonLinks, ...adminLinks] : commonLinks;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.08),transparent_18%),radial-gradient(circle_at_92%_16%,rgba(180,83,9,0.08),transparent_18%),linear-gradient(180deg,rgba(247,244,237,0.84),rgba(241,236,227,0.9))]">
      <div className="mx-auto max-w-[1720px] px-4 py-4 lg:px-6 lg:py-6">
        <div className="space-y-4 pb-8 lg:hidden">
          <section className="panel-dark p-5">
            <div className="panel-dark-soft p-4">
              <div className="flex items-center justify-between gap-4">
                <Badge className="bg-white/10 px-3 py-1 text-white" variant="neutral">
                  Prefeitura de Umbaúba
                </Badge>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-400/90 text-slate-950">
                  <Landmark className="h-5 w-5" />
                </span>
              </div>
              <div className="mt-4 min-w-0">
                <h1 className="text-2xl font-semibold leading-tight text-white" data-display="true">
                  Remanejamento Orçamentário
                </h1>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Plataforma institucional para operação, conferência e histórico dos remanejamentos entre secretarias.
                </p>
              </div>
            </div>

            <div className="mt-5 min-w-0 rounded-[1.5rem] border border-white/10 bg-slate-950/25 p-3">
              <SidebarNav items={links} mode="mobile" />
            </div>
          </section>

          <section className="panel-dark p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Sessão ativa</p>
            <p className="mt-3 break-words text-lg font-semibold">{userName}</p>
            <p className="mt-1 text-sm text-slate-300">
              {role === "ADMIN_PLANEJAMENTO" ? "Administrador de planejamento" : "Usuário de secretaria"}
            </p>
            <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-slate-300">
              Ambiente interno com controle de perfil, rastreabilidade e base institucional consolidada.
            </p>
            <form action={logoutAction} className="mt-5">
              <Button className="w-full bg-white text-slate-950 hover:bg-slate-100" type="submit">
                Encerrar sessão
              </Button>
            </form>

            <NotificationPreview notifications={notifications} unreadNotifications={unreadNotifications} />
          </section>

          <main className="min-w-0 space-y-6">{children}</main>
        </div>

        <div className="hidden lg:grid lg:min-h-screen lg:grid-cols-[340px,minmax(0,1fr)] lg:gap-7">
          <aside className="panel-dark min-w-0 self-start p-5">
            <div className="flex h-full min-w-0 flex-col">
              <div className="panel-dark-soft p-5">
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
                  <h1 className="mt-3 text-[2rem] font-semibold leading-[1.02]" data-display="true">
                    Remanejamento Orçamentário
                  </h1>
                  <p className="mt-3 text-sm leading-7 text-slate-200">
                    Operação institucional com conferência administrativa, histórico executivo e leitura setorial.
                  </p>
                </div>
              </div>

              <SidebarNav items={links} mode="desktop" />

              <div className="panel-dark-soft mt-6 p-5">
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
                  Ambiente interno com dados institucionais, controle de acesso e trilha de auditoria para cada operação.
                </p>
                <form action={logoutAction} className="mt-5">
                  <Button className="w-full bg-white text-slate-950 hover:bg-slate-100" type="submit" variant="outline">
                    Encerrar sessão
                  </Button>
                </form>
              </div>

              <NotificationPreview notifications={notifications} unreadNotifications={unreadNotifications} />
            </div>
          </aside>

          <main className="layout-shell min-w-0 overflow-hidden p-4 md:p-5">
            <div className="min-w-0 space-y-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

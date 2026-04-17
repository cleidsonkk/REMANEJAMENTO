import Link from "next/link";
import { ArrowUpRight, BellRing, CheckCheck, ClipboardCheck, Clock3 } from "lucide-react";

import { markAllNotificationsAsReadAction, markNotificationAsReadAction } from "@/app/actions/notification-actions";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { requireSession } from "@/services/authorization.service";
import {
  type NotificationListItem,
  getNotificationHref,
  listNotificationsForUser,
} from "@/services/notification.service";

function getNotificationBadge(notification: NotificationListItem) {
  if (notification.type === "REMANEJAMENTO_CREATED") {
    return {
      label: "Nova solicitacao",
      variant: "warning" as const,
    };
  }

  if (notification.type === "REMANEJAMENTO_EXECUTED") {
    return {
      label: "Execucao confirmada",
      variant: "success" as const,
    };
  }

  return {
    label: "Aviso interno",
    variant: "neutral" as const,
  };
}

function formatNotificationTimestamp(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatLastUpdate(date?: Date) {
  if (!date) {
    return "Sem registros recentes";
  }

  return formatNotificationTimestamp(date);
}

function NotificationActions({ notification }: { notification: NotificationListItem }) {
  const href = getNotificationHref(notification);

  if (notification.isRead) {
    return (
      <Link className={cn(buttonVariants({ size: "sm", variant: "outline" }), "w-full sm:w-auto")} href={href}>
        Abrir contexto
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <form action={markNotificationAsReadAction.bind(null, notification.id, href)}>
        <Button className="w-full sm:w-auto" size="sm" type="submit">
          Abrir e marcar como lida
        </Button>
      </form>
      <form action={markNotificationAsReadAction.bind(null, notification.id, "/dashboard/notificacoes")}>
        <Button className="w-full sm:w-auto" size="sm" type="submit" variant="outline">
          Marcar como lida
        </Button>
      </form>
    </div>
  );
}

export default async function NotificacoesPage() {
  const session = await requireSession();
  const notifications = await listNotificationsForUser(session.user.id, 60);
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;
  const latestNotification = notifications[0]?.createdAt;
  const executionNotifications = notifications.filter(
    (notification) => notification.type === "REMANEJAMENTO_EXECUTED",
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Comunicacao interna"
        title="Central de notificacoes operacionais"
        description="Acompanhe novas solicitacoes enviadas pelas secretarias e confirme, em um unico fluxo, quando um lote foi executado para que o usuario responsavel seja avisado sem depender de contato manual."
        aside={
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
              <p className="text-sm text-white/70">Nao lidas</p>
              <p className="mt-2 text-3xl font-semibold text-white">{unreadCount}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
              <p className="text-sm text-white/70">Ultima atualizacao</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-white">{formatLastUpdate(latestNotification)}</p>
            </div>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.75rem] border bg-white/92 p-5 shadow-panel">
          <BellRing className="h-5 w-5 text-primary" />
          <p className="mt-4 text-sm font-semibold text-slate-950">Fila administrativa clara</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Administradores recebem o aviso assim que uma secretaria registra um novo lote para conferencia.
          </p>
        </div>
        <div className="rounded-[1.75rem] border bg-white/92 p-5 shadow-panel">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          <p className="mt-4 text-sm font-semibold text-slate-950">Retorno ao solicitante</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {executionNotifications} confirmacoes de execucao ja ficaram organizadas para acompanhamento dos usuarios.
          </p>
        </div>
        <div className="rounded-[1.75rem] border bg-white/92 p-5 shadow-panel">
          <Clock3 className="h-5 w-5 text-primary" />
          <p className="mt-4 text-sm font-semibold text-slate-950">Leitura sem ruido</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Mensagens ficam agrupadas por contexto e horario para manter a triagem diaria objetiva e responsiva.
          </p>
        </div>
      </section>

      <Card className="bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(246,244,239,0.94))]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>Notificacoes recentes</CardTitle>
            <CardDescription className="mt-2">
              As notificacoes nao lidas aparecem primeiro. Use a leitura individual ou em massa para manter o painel limpo sem perder contexto.
            </CardDescription>
          </div>
          <form action={markAllNotificationsAsReadAction.bind(null, "/dashboard/notificacoes")}>
            <Button className="w-full lg:w-auto" disabled={!unreadCount} type="submit" variant="outline">
              <CheckCheck className="mr-2 h-4 w-4" />
              Marcar todas como lidas
            </Button>
          </form>
        </div>

        {notifications.length ? (
          <>
            <div className="mt-6 grid gap-4 xl:hidden">
              {notifications.map((notification) => {
                const badge = getNotificationBadge(notification);
                const href = getNotificationHref(notification);

                return (
                  <article
                    key={notification.id}
                    className={cn(
                      "rounded-[1.5rem] border px-5 py-4 shadow-sm transition",
                      notification.isRead
                        ? "border-slate-200/80 bg-white/94 text-slate-900"
                        : "border-amber-200 bg-amber-50/80 text-slate-950",
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-base font-semibold">{notification.title}</p>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                          {!notification.isRead ? <Badge variant="warning">Nao lida</Badge> : null}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-700">{notification.message}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-3">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Recebida em</p>
                        <p className="mt-2 text-sm font-medium text-slate-900">
                          {formatNotificationTimestamp(notification.createdAt)}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-3">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Contexto</p>
                        <p className="mt-2 break-words text-sm font-medium text-slate-900">
                          {notification.relatedEntityId ?? "Painel geral"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <Link
                        className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80"
                        href={href}
                      >
                        Ver registro relacionado
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                      <NotificationActions notification={notification} />
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-6 hidden overflow-x-auto rounded-[1.5rem] border bg-white xl:block">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/55">
                  <tr>
                    <th className="px-5 py-4 text-left font-semibold">Status</th>
                    <th className="px-5 py-4 text-left font-semibold">Titulo</th>
                    <th className="px-5 py-4 text-left font-semibold">Mensagem</th>
                    <th className="px-5 py-4 text-left font-semibold">Recebida em</th>
                    <th className="px-5 py-4 text-left font-semibold">Contexto</th>
                    <th className="px-5 py-4 text-left font-semibold">Acao</th>
                  </tr>
                </thead>
                <tbody>
                  {notifications.map((notification) => {
                    const badge = getNotificationBadge(notification);

                    return (
                      <tr
                        key={notification.id}
                        className={cn(
                          "border-t border-slate-200/80 align-top",
                          notification.isRead ? "bg-white" : "bg-amber-50/50",
                        )}
                      >
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={badge.variant}>{badge.label}</Badge>
                            <Badge variant={notification.isRead ? "neutral" : "warning"}>
                              {notification.isRead ? "Lida" : "Nao lida"}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="max-w-[220px]">
                            <p className="font-semibold text-slate-950">{notification.title}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-muted-foreground">
                          <div className="max-w-[420px] leading-6">{notification.message}</div>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          {formatNotificationTimestamp(notification.createdAt)}
                        </td>
                        <td className="px-5 py-4">
                          <div className="max-w-[180px] break-words text-slate-700">
                            {notification.relatedEntityId ?? "Painel geral"}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <NotificationActions notification={notification} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="mt-6">
            <EmptyState
              title="Nenhuma notificacao registrada"
              description="Assim que uma secretaria enviar um lote ou um administrador confirmar uma execucao, os avisos aparecerao organizados nesta central."
            />
          </div>
        )}
      </Card>
    </div>
  );
}

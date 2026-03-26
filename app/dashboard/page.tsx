import Link from "next/link";
import { ArrowRight, Building2, CircleDollarSign, ClipboardList, ScanSearch, TrendingUp } from "lucide-react";

import { MetricCard } from "@/components/shared/metric-card";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { DashboardCharts } from "@/features/dashboard/dashboard-charts";
import { formatCurrency } from "@/lib/utils";
import { requireSession } from "@/services/authorization.service";
import { getDashboardData } from "@/services/dashboard.service";

export default async function DashboardPage() {
  const session = await requireSession();
  const dashboard = await getDashboardData(session.user.id, session.user.role, session.user.secretariaId);

  const cards = [
    {
      label: "Total",
      value: dashboard.kpis.total,
      hint: "Solicitações registradas conforme o escopo visível ao perfil autenticado.",
      href: "/dashboard/remanejamentos",
    },
    {
      label: "Pendentes",
      value: dashboard.kpis.pendentes,
      hint: "Demandas aguardando revisão técnica e execução administrativa.",
      href: "/dashboard/remanejamentos?status=PENDENTE",
    },
    {
      label: "Realizadas",
      value: dashboard.kpis.realizadas,
      hint: "Itens já consolidados no histórico executivo institucional.",
      href: "/dashboard/executados",
    },
    {
      label: "Canceladas",
      value: dashboard.kpis.canceladas,
      hint: "Registros encerrados sem efetivação orçamentária.",
      href: "/dashboard/remanejamentos?status=CANCELADO",
    },
  ];

  const quickActions =
    session.user.role === "ADMIN_PLANEJAMENTO"
      ? [
          {
            href: "/dashboard/remanejamentos?status=PENDENTE",
            label: "Pendências administrativas",
            hint: "Abra a fila de solicitações ainda não executadas.",
          },
          {
            href: "/dashboard/executados",
            label: "Executados consolidados",
            hint: "Consulte o histórico financeiro já efetivado.",
          },
          {
            href: "/dashboard/busca",
            label: "Busca global",
            hint: "Localize protocolo, CPF, secretaria ou usuário em uma única consulta.",
          },
        ]
      : [
          {
            href: "/dashboard/remanejamentos",
            label: "Nova solicitação",
            hint: "Registre remanejamentos com catálogo vinculado à sua secretaria.",
          },
          {
            href: "/dashboard/remanejamentos?status=PENDENTE",
            label: "Acompanhamento",
            hint: "Veja rapidamente o que ainda está em análise administrativa.",
          },
        ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Painel institucional"
        title="Centro executivo de acompanhamento orçamentário"
        description="Visão consolidada para leitura gerencial das solicitações, do volume financeiro movimentado e do ritmo operacional por secretaria, com foco em decisão rápida e controle técnico."
        aside={
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="min-w-0 rounded-2xl border border-white/10 bg-slate-950/25 p-4">
              <ClipboardList className="h-5 w-5 text-amber-200" />
              <p className="mt-3 text-sm text-white/70">Leitura operacional</p>
              <p className="mt-1 text-lg font-semibold text-white">Fluxo monitorado em tempo real</p>
            </div>
            <div className="min-w-0 rounded-2xl border border-white/10 bg-slate-950/25 p-4">
              <TrendingUp className="h-5 w-5 text-amber-200" />
              <p className="mt-3 text-sm text-white/70">Direção gerencial</p>
              <p className="mt-1 text-lg font-semibold text-white">Distribuição setorial e financeira</p>
            </div>
          </div>
        }
      />

      <section className="grid gap-4 xl:grid-cols-4">
        {cards.map((card) => (
          <MetricCard key={card.label} hint={card.hint} href={card.href} label={card.label} value={card.value} />
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr),minmax(320px,0.8fr)]">
        <div className="surface-card border-slate-900/70 bg-[linear-gradient(145deg,rgba(5,18,34,0.98),rgba(10,32,54,0.98)_52%,rgba(12,48,70,0.96))] p-7 text-white">
          <div className="flex items-start justify-between gap-5">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Volume consolidado</p>
              <h2 className="mt-4 break-words text-4xl font-semibold tracking-[-0.04em] text-white">
                {formatCurrency(dashboard.volumeFinanceiro)}
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200">
                Total movimentado pelas solicitações dentro do recorte atual, com leitura preparada para
                acompanhamento executivo e auditoria interna.
              </p>
            </div>
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.6rem] border border-white/10 bg-white/10 text-white shadow-lg">
              <CircleDollarSign className="h-7 w-7" />
            </span>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2">
            <div className="min-w-0 rounded-[1.5rem] border border-white/10 bg-white/6 p-5">
              <Building2 className="h-5 w-5 text-amber-200" />
              <p className="mt-4 text-sm font-semibold text-white">Ranking institucional</p>
              <p className="mt-2 text-sm leading-7 text-slate-200">
                Compare secretarias por quantidade de solicitações e expressão financeira.
              </p>
            </div>
            <div className="min-w-0 rounded-[1.5rem] border border-white/10 bg-white/6 p-5">
              <TrendingUp className="h-5 w-5 text-amber-200" />
              <p className="mt-4 text-sm font-semibold text-white">Comportamento mensal</p>
              <p className="mt-2 text-sm leading-7 text-slate-200">
                Observe a cadência operacional recente e antecipe períodos de maior carga.
              </p>
            </div>
          </div>
        </div>

        <div className="surface-card border-slate-900/70 bg-[linear-gradient(145deg,rgba(5,18,34,0.98),rgba(10,32,54,0.98)_52%,rgba(12,48,70,0.96))] p-7 text-white">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Prioridades do ambiente</p>
            <Badge className="whitespace-nowrap" variant={dashboard.kpis.pendentes > 0 ? "warning" : "success"}>
              {dashboard.kpis.pendentes > 0 ? `${dashboard.kpis.pendentes} pendentes` : "Sem fila crítica"}
            </Badge>
          </div>
          <div className="mt-5 space-y-4">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-5">
              <p className="text-sm font-semibold text-white">Fila administrativa</p>
              <p className="mt-2 text-sm leading-7 text-slate-200">
                Priorize as solicitações pendentes com base no impacto financeiro e na secretaria demandante.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-5">
              <p className="text-sm font-semibold text-white">Trilha de governança</p>
              <p className="mt-2 text-sm leading-7 text-slate-200">
                Cada execução preserva origem, destino, valores, protocolo e histórico de auditoria.
              </p>
            </div>
            {session.user.role === "ADMIN_PLANEJAMENTO" ? (
              <div className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(135deg,rgba(7,25,42,0.98),rgba(13,58,78,0.96))] p-5 text-white">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ScanSearch className="h-4 w-4 text-amber-200" />
                  Ação rápida disponível
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-200">
                  Use a busca global para atravessar rapidamente protocolos, CPFs, secretarias e usuários.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            className="surface-card group min-w-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,244,239,0.94))] p-5 transition-all hover:-translate-y-0.5 hover:shadow-glow"
            href={action.href}
          >
            <div className="flex items-center justify-between gap-4">
              <p className="min-w-0 text-base font-semibold text-slate-950">{action.label}</p>
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-hover:translate-x-1" />
            </div>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{action.hint}</p>
          </Link>
        ))}
      </section>

      <DashboardCharts monthSeries={dashboard.monthSeries} secretarias={dashboard.secretarias} />
    </div>
  );
}

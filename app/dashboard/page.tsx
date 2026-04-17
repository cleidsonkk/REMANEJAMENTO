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

  const volumeLabel = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dashboard.volumeFinanceiro);

  const ticketMedio = dashboard.kpis.total ? dashboard.volumeFinanceiro / dashboard.kpis.total : 0;
  const taxaConclusao = dashboard.kpis.total ? Math.round((dashboard.kpis.realizadas / dashboard.kpis.total) * 100) : 0;
  const secretariaLider = dashboard.secretarias[0] ?? null;
  const ultimoMes = dashboard.monthSeries.at(-1) ?? null;

  const cards = [
    {
      label: "Total",
      value: dashboard.kpis.total,
      hint: "Solicitações registradas no escopo visível ao perfil autenticado.",
      href: "/dashboard/remanejamentos",
    },
    {
      label: "Pendentes",
      value: dashboard.kpis.pendentes,
      hint: "Solicitações aguardando análise administrativa.",
      href: "/dashboard/remanejamentos?status=PENDENTE",
    },
    {
      label: "Realizadas",
      value: dashboard.kpis.realizadas,
      hint: "Itens consolidados no histórico executivo.",
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
            hint: "Abra a fila de solicitações que ainda aguardam conferência final.",
          },
          {
            href: "/dashboard/executados",
            label: "Executados consolidados",
            hint: "Consulte o histórico financeiro já efetivado no sistema.",
          },
          {
            href: "/dashboard/busca",
            label: "Busca global",
            hint: "Localize protocolos, CPFs, secretarias e usuários em um único fluxo.",
          },
        ]
      : [
          {
            href: "/dashboard/remanejamentos",
            label: "Nova solicitação",
            hint: "Registre remanejamentos com base no catálogo da sua secretaria.",
          },
          {
            href: "/dashboard/remanejamentos?status=PENDENTE",
            label: "Acompanhamento",
            hint: "Acompanhe os lotes ainda em análise administrativa.",
          },
        ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Painel institucional"
        title="Acompanhamento executivo do remanejamento"
        description="Leitura consolidada das solicitações, do volume movimentado e das prioridades operacionais por secretaria."
        aside={
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="panel-dark-soft min-w-0 p-4">
              <ClipboardList className="h-5 w-5 text-amber-200" />
              <p className="mt-3 text-sm text-white/70">Leitura operacional</p>
              <p className="mt-1 text-lg font-semibold text-white">Fluxo monitorado</p>
            </div>
            <div className="panel-dark-soft min-w-0 p-4">
              <TrendingUp className="h-5 w-5 text-amber-200" />
              <p className="mt-3 text-sm text-white/70">Direção gerencial</p>
              <p className="mt-1 text-lg font-semibold text-white">Distribuição setorial</p>
            </div>
          </div>
        }
      />

      <section className="grid gap-4 xl:grid-cols-4">
        {cards.map((card) => (
          <MetricCard key={card.label} hint={card.hint} href={card.href} label={card.label} value={card.value} />
        ))}
      </section>

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1.24fr),minmax(320px,0.76fr)]">
        <div className="panel-dark min-w-0 p-5 sm:p-7 text-white">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Volume consolidado</p>
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <span className="rounded-full border border-white/12 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-amber-100">
                  R$
                </span>
                <h2
                  className="min-w-0 max-w-full text-[clamp(2.35rem,7vw,5rem)] font-semibold leading-[0.92] tracking-[-0.06em] text-white"
                  data-display="true"
                >
                  {volumeLabel}
                </h2>
              </div>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-200 md:text-[15px]">
                Total movimentado pelas solicitações dentro do recorte atual, com leitura voltada ao acompanhamento executivo.
              </p>
            </div>

            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[1.6rem] border border-white/10 bg-white/10 text-white shadow-lg">
              <CircleDollarSign className="h-7 w-7" />
            </span>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="min-w-0 rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-300">Ticket médio</p>
              <p className="mt-3 text-lg font-semibold text-white">{formatCurrency(ticketMedio)}</p>
              <p className="mt-2 text-sm leading-6 text-slate-200">Valor médio por solicitação registrada.</p>
            </div>
            <div className="min-w-0 rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-300">Conclusão</p>
              <p className="mt-3 text-lg font-semibold text-white">{taxaConclusao}%</p>
              <p className="mt-2 text-sm leading-6 text-slate-200">Percentual do fluxo já encerrado como realizado.</p>
            </div>
            <div className="min-w-0 rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-300">Secretaria líder</p>
              <p className="mt-3 line-clamp-2 text-base font-semibold text-white">
                {secretariaLider?.secretaria ?? "Sem dados setoriais"}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                {secretariaLider ? `${secretariaLider.quantidade} solicitações no ranking atual.` : "Ainda sem movimentação consolidada."}
              </p>
            </div>
            <div className="min-w-0 rounded-[1.5rem] border border-white/10 bg-white/6 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-300">Última referência</p>
              <p className="mt-3 text-lg font-semibold text-white">{ultimoMes?.mes ?? "Sem série"}</p>
              <p className="mt-2 text-sm leading-6 text-slate-200">
                {ultimoMes ? `${formatCurrency(ultimoMes.valor)} movimentados no período mais recente.` : "Sem base recente para comparação."}
              </p>
            </div>
          </div>
        </div>

        <div className="panel-dark min-w-0 p-5 sm:p-7 text-white">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Prioridades do ambiente</p>
            <Badge className="whitespace-nowrap self-start sm:self-auto" variant={dashboard.kpis.pendentes > 0 ? "warning" : "success"}>
              {dashboard.kpis.pendentes > 0 ? `${dashboard.kpis.pendentes} pendentes` : "Sem fila crítica"}
            </Badge>
          </div>
          <div className="mt-5 space-y-4">
            <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-5">
              <div className="flex items-start gap-3">
                <Building2 className="mt-1 h-5 w-5 text-amber-200" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">Fila administrativa</p>
                  <p className="mt-2 text-sm leading-7 text-slate-200">
                    Priorize as solicitações pendentes por secretaria, volume e urgência operacional.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/6 p-5">
              <div className="flex items-start gap-3">
                <TrendingUp className="mt-1 h-5 w-5 text-amber-200" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">Trilha de governança</p>
                  <p className="mt-2 text-sm leading-7 text-slate-200">
                    Cada execução preserva origem, destino, valores, protocolo e auditoria institucional.
                  </p>
                </div>
              </div>
            </div>
            {session.user.role === "ADMIN_PLANEJAMENTO" ? (
              <div className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(135deg,rgba(7,25,42,0.98),rgba(13,58,78,0.96))] p-5 text-white">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ScanSearch className="h-4 w-4 text-amber-200" />
                  Ação rápida disponível
                </div>
                <p className="mt-2 text-sm leading-7 text-slate-200">
                  Use a busca global para localizar protocolos, CPFs, secretarias e usuários com rapidez.
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
            className="surface-card group min-w-0 p-5 transition-all hover:-translate-y-0.5 hover:shadow-glow"
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

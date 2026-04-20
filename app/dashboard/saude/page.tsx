import { Activity, Database, ShieldAlert, Siren, TimerReset } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/services/authorization.service";
import { formatUptime, getSystemHealthSnapshot, type HealthStatus } from "@/services/system-health.service";

function getVariant(status: HealthStatus) {
  if (status === "healthy") {
    return "success";
  }

  if (status === "degraded") {
    return "warning";
  }

  return "danger";
}

function getStatusLabel(status: HealthStatus) {
  if (status === "healthy") {
    return "Saudavel";
  }

  if (status === "degraded") {
    return "Atencao";
  }

  return "Critico";
}

export default async function SaudePage() {
  await requireRole("ADMIN_PLANEJAMENTO");
  const snapshot = await getSystemHealthSnapshot();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operacao"
        title="Saude operacional do sistema"
        description="Leitura executiva de disponibilidade, ambiente, fila operacional e sinais de risco para suporte rapido."
        aside={
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
              <p className="text-sm text-white/70">Status geral</p>
              <div className="mt-3">
                <Badge variant={getVariant(snapshot.status)}>{getStatusLabel(snapshot.status)}</Badge>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
              <p className="text-sm text-white/70">Tempo de resposta</p>
              <p className="mt-2 text-3xl font-semibold text-white">{snapshot.responseTimeMs} ms</p>
            </div>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[1.75rem] border bg-white/92 p-5 shadow-panel">
          <Activity className="h-5 w-5 text-primary" />
          <p className="mt-4 text-sm font-semibold text-slate-950">Usuarios ativos</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{snapshot.stats.activeUsers}</p>
        </div>
        <div className="rounded-[1.75rem] border bg-white/92 p-5 shadow-panel">
          <Database className="h-5 w-5 text-primary" />
          <p className="mt-4 text-sm font-semibold text-slate-950">Pendencias</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{snapshot.stats.pendingRemanejamentos}</p>
        </div>
        <div className="rounded-[1.75rem] border bg-white/92 p-5 shadow-panel">
          <Siren className="h-5 w-5 text-primary" />
          <p className="mt-4 text-sm font-semibold text-slate-950">Falhas de login 24h</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{snapshot.stats.failedLoginsLast24h}</p>
        </div>
        <div className="rounded-[1.75rem] border bg-white/92 p-5 shadow-panel">
          <TimerReset className="h-5 w-5 text-primary" />
          <p className="mt-4 text-sm font-semibold text-slate-950">Uptime do processo</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{formatUptime(snapshot.uptimeSeconds)}</p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.95fr,1.05fr]">
        <Card className="bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(246,244,239,0.94))]">
          <CardTitle>Ambiente atual</CardTitle>
          <CardDescription className="mt-2">
            Referencias tecnicas do deployment em uso para diagnostico e suporte institucional.
          </CardDescription>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Ambiente</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{snapshot.deployment.environment}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Regiao</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{snapshot.deployment.region}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Commit</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{snapshot.deployment.commitSha}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Branch</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{snapshot.deployment.commitRef}</p>
            </div>
          </div>

          <div className="mt-6 rounded-[1.5rem] border bg-muted/35 p-4 text-sm leading-6 text-slate-600">
            Ultima leitura em {snapshot.checkedAt.toLocaleString("pt-BR")} com resposta total de {snapshot.responseTimeMs} ms.
          </div>
        </Card>

        <Card className="bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(246,244,239,0.94))]">
          <CardTitle>Checks operacionais</CardTitle>
          <CardDescription className="mt-2">
            Verificacoes essenciais para detectar indisponibilidade, ambiente incompleto e fila sob pressao.
          </CardDescription>

          <div className="mt-6 space-y-4">
            {snapshot.checks.map((check) => (
              <article
                key={check.key}
                className="rounded-[1.5rem] border border-slate-200/80 bg-white/92 px-5 py-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-primary" />
                      <p className="text-sm font-semibold text-slate-950">{check.label}</p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{check.detail}</p>
                  </div>
                  <Badge className="shrink-0" variant={getVariant(check.status)}>
                    {getStatusLabel(check.status)}
                  </Badge>
                </div>
              </article>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

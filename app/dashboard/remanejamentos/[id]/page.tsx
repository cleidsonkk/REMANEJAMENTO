import Link from "next/link";
import { ArrowLeft, CheckCircle2, FileSearch, Landmark, ReceiptText, UserRound } from "lucide-react";
import { redirect } from "next/navigation";

import { executeRemanejamentoAndRedirectAction } from "@/app/actions/remanejamento-actions";
import { PageHeader } from "@/components/shared/page-header";
import { StatusTimeline } from "@/components/shared/status-timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { canViewRemanejamento } from "@/lib/access-control";
import { formatCpf, formatCurrency, formatGovernmentCode } from "@/lib/utils";
import { buildRemanejamentoTimeline, getRemanejamentoGroupById } from "@/services/remanejamento.service";
import { requireSession } from "@/services/authorization.service";

type Params = Promise<{ id: string }>;

export default async function RemanejamentoDetailsPage({ params }: { params: Params }) {
  const session = await requireSession();
  const { id } = await params;
  const remanejamentoGroup = await getRemanejamentoGroupById(id);

  if (!remanejamentoGroup) {
    redirect("/dashboard/remanejamentos");
  }

  const canView = canViewRemanejamento({
    currentRole: session.user.role,
    currentUserId: session.user.id,
    ownerUserId: remanejamentoGroup.current.solicitanteId,
  });

  if (!canView) {
    redirect("/dashboard/remanejamentos");
  }

  const first = remanejamentoGroup.current;
  const loteStatus =
    remanejamentoGroup.itens.some((item) => item.status === "PENDENTE")
      ? "PENDENTE"
      : remanejamentoGroup.itens.some((item) => item.status === "CANCELADO")
        ? "CANCELADO"
        : "REALIZADO";

  const isAdmin = session.user.role === "ADMIN_PLANEJAMENTO";
  const isPending = loteStatus === "PENDENTE";
  const totalLote = remanejamentoGroup.itens.reduce((sum, item) => sum + Number(item.destinoValor), 0);
  const timeline = buildRemanejamentoTimeline({
    loteProtocolo: remanejamentoGroup.loteProtocolo,
    status: loteStatus,
    dataSolicitacao: first.dataSolicitacao,
    dataConclusao:
      remanejamentoGroup.itens
        .map((item) => item.dataConclusao)
        .filter(Boolean)
        .sort((a, b) => b!.getTime() - a!.getTime())[0] ?? null,
    itens: remanejamentoGroup.itens,
    auditLogs: remanejamentoGroup.auditLogs,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Conferência"
        title={`Lote ${remanejamentoGroup.loteProtocolo}`}
        description="Revise os dados institucionais, a justificativa, todos os itens orçamentários e a linha do tempo antes de confirmar o remanejamento."
        aside={
          <div className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
              <p className="text-sm text-white/70">Status atual</p>
              <div className="mt-2">
                <Badge
                  variant={loteStatus === "REALIZADO" ? "success" : loteStatus === "CANCELADO" ? "danger" : "warning"}
                >
                  {loteStatus}
                </Badge>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
              <p className="text-sm text-white/70">Itens no lote</p>
              <p className="mt-2 text-base font-semibold">{remanejamentoGroup.itens.length}</p>
            </div>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Link className="inline-flex items-center gap-2 text-sm font-medium text-primary" href="/dashboard/remanejamentos">
          <ArrowLeft className="h-4 w-4" />
          Voltar para a listagem
        </Link>
      </div>

      <section className="grid gap-4 lg:grid-cols-4">
        <div className="rounded-[1.75rem] border bg-white/92 p-5 shadow-panel">
          <Landmark className="h-5 w-5 text-primary" />
          <p className="mt-4 text-sm font-semibold">Dados institucionais</p>
          <div className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
            <p>{first.nomeSecretaria}</p>
            <p>Unidade {formatGovernmentCode(first.unidadeOrcamentaria)}</p>
            <p>Secretário: {first.nomeSecretario}</p>
          </div>
        </div>
        <div className="rounded-[1.75rem] border bg-white/92 p-5 shadow-panel">
          <UserRound className="h-5 w-5 text-primary" />
          <p className="mt-4 text-sm font-semibold">Solicitante</p>
          <div className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
            <p>{first.nomeSolicitante}</p>
            <p>{formatCpf(first.cpfSolicitante)}</p>
          </div>
        </div>
        <div className="rounded-[1.75rem] border bg-white/92 p-5 shadow-panel">
          <ReceiptText className="h-5 w-5 text-primary" />
          <p className="mt-4 text-sm font-semibold">Valor total do lote</p>
          <div className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
            <p className="text-xl font-semibold text-slate-950">{formatCurrency(totalLote)}</p>
            <p>{remanejamentoGroup.itens.length} itens consolidados na mesma solicitação.</p>
          </div>
        </div>
        <div className="rounded-[1.75rem] border bg-white/92 p-5 shadow-panel">
          <FileSearch className="h-5 w-5 text-primary" />
          <p className="mt-4 text-sm font-semibold">Conferência prévia</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Antes da confirmação, revise ação, fonte, elemento e valor de cada item de adição e anulação.
          </p>
        </div>
      </section>

      <Card className="border-white/70 bg-white/92">
        <CardTitle>Justificativa institucional</CardTitle>
        <CardDescription className="mt-2">
          Fundamentação registrada pelo solicitante para o lote completo.
        </CardDescription>
        <div className="mt-6 rounded-[1.5rem] border bg-muted/35 p-5 text-sm leading-7 text-muted-foreground">
          {first.justificativa}
        </div>
      </Card>

      <Card className="border-white/70 bg-white/92">
        <CardTitle>Histórico e linha do tempo do lote</CardTitle>
        <CardDescription className="mt-2">
          Acompanhamento reforçado da criação, análise, execução e auditoria institucional.
        </CardDescription>
        <div className="mt-6">
          <StatusTimeline events={timeline} />
        </div>
      </Card>

      <div className="space-y-4">
        {remanejamentoGroup.itens.map((item) => (
          <Card key={item.id} className="border-white/70 bg-white/92">
            <div className="flex flex-col gap-3 border-b border-slate-200/70 pb-5 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>{`Item ${String(item.loteSequencia).padStart(2, "0")} • ${item.protocolo}`}</CardTitle>
                <CardDescription className="mt-2">
                  Dados completos da movimentação orçamentária deste item dentro do lote.
                </CardDescription>
              </div>
              <Badge
                variant={item.status === "REALIZADO" ? "success" : item.status === "CANCELADO" ? "danger" : "warning"}
              >
                {item.status}
              </Badge>
            </div>

            <section className="mt-6 grid gap-4 xl:grid-cols-2">
              <Card className="border-emerald-200/80 bg-emerald-50/60">
                <CardTitle className="flex items-center gap-2 text-emerald-950">
                  <ReceiptText className="h-5 w-5" />
                  Adição
                </CardTitle>
                <CardDescription className="mt-2 text-emerald-900/80">
                  Dotação de destino que receberá o valor do remanejamento.
                </CardDescription>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-emerald-200 bg-white/80 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-900/65">Ação</p>
                    <p className="mt-2 font-semibold text-emerald-950">{item.destinoAcao}</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-200 bg-white/80 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-900/65">Fonte</p>
                    <p className="mt-2 font-semibold text-emerald-950">{item.destinoFonte}</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-200 bg-white/80 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-900/65">Elemento</p>
                    <p className="mt-2 font-semibold text-emerald-950">{item.destinoElemento}</p>
                  </div>
                  <div className="rounded-2xl border border-emerald-200 bg-white/80 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-900/65">Valor</p>
                    <p className="mt-2 font-semibold text-emerald-950">{formatCurrency(item.destinoValor.toString())}</p>
                  </div>
                </div>
              </Card>

              <Card className="border-amber-200/80 bg-amber-50/60">
                <CardTitle className="flex items-center gap-2 text-amber-950">
                  <ReceiptText className="h-5 w-5" />
                  Anulação
                </CardTitle>
                <CardDescription className="mt-2 text-amber-900/80">
                  Dotação de origem que suportará a movimentação orçamentária.
                </CardDescription>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-amber-200 bg-white/80 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-amber-900/65">Ação</p>
                    <p className="mt-2 font-semibold text-amber-950">{item.origemAcao}</p>
                  </div>
                  <div className="rounded-2xl border border-amber-200 bg-white/80 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-amber-900/65">Fonte</p>
                    <p className="mt-2 font-semibold text-amber-950">{item.origemFonte}</p>
                  </div>
                  <div className="rounded-2xl border border-amber-200 bg-white/80 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-amber-900/65">Elemento</p>
                    <p className="mt-2 font-semibold text-amber-950">{item.origemElemento}</p>
                  </div>
                  <div className="rounded-2xl border border-amber-200 bg-white/80 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-amber-900/65">Valor</p>
                    <p className="mt-2 font-semibold text-amber-950">{formatCurrency(item.origemValor.toString())}</p>
                  </div>
                </div>
              </Card>
            </section>
          </Card>
        ))}
      </div>

      {isAdmin ? (
        <Card className="border-white/70 bg-white/92">
          <CardTitle>Confirmação administrativa do lote</CardTitle>
          <CardDescription className="mt-2">
            A confirmação gera registros imutáveis em executados e trilha de auditoria institucional para todos os itens.
          </CardDescription>
          <div className="mt-6 flex flex-col gap-4 rounded-[1.5rem] border bg-muted/35 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold">
                {isPending ? "Lote pronto para conferência final e confirmação." : "Este lote já não está pendente."}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Revise os dados orçamentários e a linha do tempo acima antes de concluir a execução administrativa.
              </p>
            </div>
            {isPending ? (
              <form action={executeRemanejamentoAndRedirectAction.bind(null, remanejamentoGroup.current.id, "/dashboard/remanejamentos")}>
                <Button className="min-w-[260px]" type="submit">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Confirmar remanejamento do lote
                </Button>
              </form>
            ) : (
              <Badge variant={loteStatus === "REALIZADO" ? "success" : "warning"}>{loteStatus}</Badge>
            )}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

import Link from "next/link";
import { ArrowLeft, CheckCircle2, FileSearch, Landmark, ReceiptText, RefreshCcw, UserRound, XCircle } from "lucide-react";
import { redirect } from "next/navigation";

import {
  cancelRemanejamentoAndRedirectAction,
  executeRemanejamentoAndRedirectAction,
  requestRemanejamentoCorrectionAndRedirectAction,
} from "@/app/actions/remanejamento-actions";
import { PageHeader } from "@/components/shared/page-header";
import { StatusTimeline } from "@/components/shared/status-timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { canViewRemanejamento } from "@/lib/access-control";
import { formatCpf, formatCurrency, formatGovernmentCode } from "@/lib/utils";
import { buildRemanejamentoTimeline, getRemanejamentoCorrectionLinkage, getRemanejamentoGroupById } from "@/services/remanejamento.service";
import { requireSession } from "@/services/authorization.service";

type Params = Promise<{ id: string }>;
type RemanejamentoGroup = NonNullable<Awaited<ReturnType<typeof getRemanejamentoGroupById>>>;
type RemanejamentoItem = RemanejamentoGroup["itens"][number];

function getStatusBadgeVariant(status: RemanejamentoItem["status"]) {
  if (status === "REALIZADO") {
    return "success" as const;
  }

  if (status === "CANCELADO") {
    return "danger" as const;
  }

  return "warning" as const;
}

function getAdministrativeReason(logs: RemanejamentoGroup["auditLogs"]) {
  const latestDecision = [...logs]
    .reverse()
    .find((log) => log.entity === "LoteRemanejamento" && (log.action === "RETURN_BATCH" || log.action === "CANCEL_BATCH"));

  if (!latestDecision?.newData || typeof latestDecision.newData !== "object" || Array.isArray(latestDecision.newData)) {
    return null;
  }

  const reason = "reason" in latestDecision.newData ? latestDecision.newData.reason : null;
  if (typeof reason !== "string" || !reason.trim()) {
    return null;
  }

  return {
    mode: latestDecision.action,
    reason: reason.trim(),
  };
}

function RemanejamentoItemCard({ item }: { item: RemanejamentoItem }) {
  return (
    <Card className="border-white/70 bg-white/92">
      <div className="flex flex-col gap-3 border-b border-slate-200/70 pb-5 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>{`Item ${String(item.loteSequencia).padStart(2, "0")} • ${item.protocolo}`}</CardTitle>
          <CardDescription className="mt-2">Dados completos da movimentacao orcamentaria deste item dentro do lote.</CardDescription>
        </div>
        <Badge variant={getStatusBadgeVariant(item.status)}>{item.status}</Badge>
      </div>

      <section className="mt-6 grid gap-4 xl:grid-cols-2">
        <Card className="border-emerald-200/80 bg-emerald-50/60">
          <CardTitle className="flex items-center gap-2 text-emerald-950">
            <ReceiptText className="h-5 w-5" />
            Adicao
          </CardTitle>
          <CardDescription className="mt-2 text-emerald-900/80">Dotacao de destino que recebera o valor do remanejamento.</CardDescription>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200 bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-900/65">Acao</p>
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
            Anulacao
          </CardTitle>
          <CardDescription className="mt-2 text-amber-900/80">Dotacao de origem que suportara a movimentacao orcamentaria.</CardDescription>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-amber-200 bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-amber-900/65">Acao</p>
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
  );
}

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
      : remanejamentoGroup.itens.some((item) => item.status === "DEVOLVIDO_PARA_CORRECAO")
        ? "DEVOLVIDO_PARA_CORRECAO"
      : remanejamentoGroup.itens.some((item) => item.status === "CANCELADO")
        ? "CANCELADO"
        : "REALIZADO";

  const isAdmin = session.user.role === "ADMIN_PLANEJAMENTO";
  const canCorrectReturnedBatch = session.user.role === "USUARIO_SECRETARIA" && loteStatus === "DEVOLVIDO_PARA_CORRECAO";
  const isPending = loteStatus === "PENDENTE";
  const totalLote = remanejamentoGroup.itens.reduce((sum, item) => sum + Number(item.destinoValor), 0);
  const previewItems = remanejamentoGroup.itens.slice(0, 3);
  const remainingItems = remanejamentoGroup.itens.slice(3);
  const justificationPreview =
    first.justificativa.length > 360 ? `${first.justificativa.slice(0, 360).trimEnd()}...` : first.justificativa;
  const administrativeReason = getAdministrativeReason(remanejamentoGroup.auditLogs);
  const correctionLinkage = getRemanejamentoCorrectionLinkage(remanejamentoGroup.loteProtocolo, remanejamentoGroup.auditLogs);

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
        eyebrow="Conferencia"
        title={`Lote ${remanejamentoGroup.loteProtocolo}`}
        description="Revise os dados institucionais, a justificativa, os itens orcamentarios e a linha do tempo antes de concluir a analise administrativa."
        aside={
          <div className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
              <p className="text-sm text-white/70">Status atual</p>
              <div className="mt-2">
                <Badge variant={getStatusBadgeVariant(loteStatus)}>{loteStatus}</Badge>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
              <p className="text-sm text-white/70">Itens no lote</p>
              <p className="mt-2 text-base font-semibold text-white">{remanejamentoGroup.itens.length}</p>
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
            <p>Secretario: {first.nomeSecretario}</p>
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
            <p>{remanejamentoGroup.itens.length} itens consolidados na mesma solicitacao.</p>
          </div>
        </div>
        <div className="rounded-[1.75rem] border bg-white/92 p-5 shadow-panel">
          <FileSearch className="h-5 w-5 text-primary" />
          <p className="mt-4 text-sm font-semibold">Conferencia previa</p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Antes da decisao final, revise acao, fonte, elemento e valor de cada item de adicao e anulacao.
          </p>
        </div>
      </section>

      {administrativeReason ? (
        <Card className="border-white/70 bg-white/92">
          <CardTitle>{administrativeReason.mode === "RETURN_BATCH" ? "Lote devolvido para correcao" : "Cancelamento administrativo"}</CardTitle>
          <CardDescription className="mt-2">Motivo registrado pelo administrador na trilha institucional.</CardDescription>
          <div className="mt-6 rounded-[1.5rem] border bg-muted/35 p-5 text-sm leading-7 text-muted-foreground">
            <p className="whitespace-pre-wrap">{administrativeReason.reason}</p>
          </div>
          {canCorrectReturnedBatch ? (
            <div className="mt-6">
              <Link href={`/dashboard/remanejamentos?correctionOf=${remanejamentoGroup.current.id}`}>
                <Button type="button">
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Corrigir e reenviar este lote
                </Button>
              </Link>
            </div>
          ) : null}
        </Card>
      ) : null}

      {correctionLinkage.correctedFromLoteProtocolo || correctionLinkage.correctedByLoteProtocolo ? (
        <Card className="border-white/70 bg-white/92">
          <CardTitle>Rastreabilidade da correcao</CardTitle>
          <CardDescription className="mt-2">Vinculo entre o lote original e o lote corrigido para leitura historica completa.</CardDescription>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {correctionLinkage.correctedFromLoteProtocolo ? (
              <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50/70 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-emerald-900/70">Este lote corrige</p>
                <p className="mt-2 text-lg font-semibold text-emerald-950">{correctionLinkage.correctedFromLoteProtocolo}</p>
                <div className="mt-4">
                  <Link href={`/dashboard/remanejamentos?q=${encodeURIComponent(correctionLinkage.correctedFromLoteProtocolo)}`}>
                    <Button size="sm" type="button" variant="outline">
                      Ver lote original
                    </Button>
                  </Link>
                </div>
              </div>
            ) : null}

            {correctionLinkage.correctedByLoteProtocolo ? (
              <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50/70 p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-amber-900/70">Este lote foi corrigido por</p>
                <p className="mt-2 text-lg font-semibold text-amber-950">{correctionLinkage.correctedByLoteProtocolo}</p>
                <div className="mt-4">
                  <Link href={`/dashboard/remanejamentos?q=${encodeURIComponent(correctionLinkage.correctedByLoteProtocolo)}`}>
                    <Button size="sm" type="button" variant="outline">
                      Ver lote corrigido
                    </Button>
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card className="border-white/70 bg-white/92">
        <CardTitle>Justificativa institucional</CardTitle>
        <CardDescription className="mt-2">Fundamentacao registrada pelo solicitante para o lote completo.</CardDescription>
        <div className="mt-6 rounded-[1.5rem] border bg-muted/35 p-5 text-sm leading-7 text-muted-foreground">
          <p>{justificationPreview}</p>
          {first.justificativa.length > 360 ? (
            <details className="group mt-4">
              <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                <span className="group-open:hidden">Ver mais</span>
                <span className="hidden group-open:inline">Ver menos</span>
              </summary>
              <p className="mt-4 whitespace-pre-wrap">{first.justificativa}</p>
            </details>
          ) : null}
        </div>
      </Card>

      <Card className="border-white/70 bg-white/92">
        <CardTitle>Historico e linha do tempo do lote</CardTitle>
        <CardDescription className="mt-2">Acompanhamento da criacao, analise, execucao e auditoria institucional.</CardDescription>
        <div className="mt-6">
          <StatusTimeline events={timeline} />
        </div>
      </Card>

      <div className="space-y-4">
        {previewItems.map((item) => (
          <RemanejamentoItemCard key={item.id} item={item} />
        ))}

        {remainingItems.length ? (
          <Card className="border-white/70 bg-white/92">
            <CardTitle>Itens adicionais do lote</CardTitle>
            <CardDescription className="mt-2">O lote possui mais registros alem dos exibidos inicialmente para manter a leitura objetiva.</CardDescription>
            <details className="group mt-6">
              <summary className="cursor-pointer list-none text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                <span className="group-open:hidden">Ver mais {remainingItems.length} itens</span>
                <span className="hidden group-open:inline">Ver menos</span>
              </summary>
              <div className="mt-4 space-y-4">
                {remainingItems.map((item) => (
                  <RemanejamentoItemCard key={item.id} item={item} />
                ))}
              </div>
            </details>
          </Card>
        ) : null}
      </div>

      {isAdmin ? (
        <Card className="border-white/70 bg-white/92">
          <CardTitle>Decisao administrativa do lote</CardTitle>
          <CardDescription className="mt-2">
            O administrador agora pode confirmar, devolver para correcao ou cancelar o lote com motivo registrado.
          </CardDescription>
          <div className="mt-6 rounded-[1.5rem] border bg-muted/35 p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold">
                  {isPending ? "Lote pendente de decisao administrativa." : "Este lote ja foi concluido pelo administrador."}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Use a confirmacao para concluir a execucao. Se houver erro na solicitacao, informe o motivo para devolver ao solicitante
                  ou cancelar o lote.
                </p>
              </div>
              {!isPending ? <Badge variant={getStatusBadgeVariant(loteStatus)}>{loteStatus}</Badge> : null}
            </div>

            {isPending ? (
              <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
                <form className="space-y-4">
                  <div>
                    <Label htmlFor="reason">Motivo para correcao ou cancelamento</Label>
                    <Textarea
                      required
                      id="reason"
                      name="reason"
                      minLength={10}
                      placeholder="Explique o que precisa ser ajustado ou por que o lote deve ser cancelado."
                    />
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      className="sm:min-w-[240px]"
                      formAction={requestRemanejamentoCorrectionAndRedirectAction.bind(null, remanejamentoGroup.current.id, "/dashboard/remanejamentos")}
                      type="submit"
                      variant="outline"
                    >
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      Solicitar correcao
                    </Button>
                    <Button
                      className="sm:min-w-[220px]"
                      formAction={cancelRemanejamentoAndRedirectAction.bind(null, remanejamentoGroup.current.id, "/dashboard/remanejamentos")}
                      type="submit"
                      variant="destructive"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Cancelar lote
                    </Button>
                  </div>
                </form>

                <form action={executeRemanejamentoAndRedirectAction.bind(null, remanejamentoGroup.current.id, "/dashboard/remanejamentos")}>
                  <Button className="min-w-[260px]" type="submit">
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Confirmar remanejamento do lote
                  </Button>
                </form>
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}
    </div>
  );
}

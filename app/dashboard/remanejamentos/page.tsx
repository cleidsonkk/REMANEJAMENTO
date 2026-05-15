import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusTimeline } from "@/components/shared/status-timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { RemanejamentoForm } from "@/features/remanejamentos/remanejamento-form";
import { prisma } from "@/lib/prisma";
import { formatCpf, formatCurrency, formatGovernmentCode } from "@/lib/utils";
import {
  getRemanejamentoCorrectionLinkageMap,
  getRemanejamentoCorrectionPreset,
  groupRemanejamentosByLote,
  listRemanejamentos,
} from "@/services/remanejamento.service";
import { requireSession } from "@/services/authorization.service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type LoteGroup = ReturnType<typeof groupRemanejamentosByLote>[number];
type LoteItem = LoteGroup["itens"][number];

function getStatusBadgeVariant(status: LoteGroup["status"]) {
  if (status === "REALIZADO") {
    return "success" as const;
  }

  if (status === "CANCELADO") {
    return "danger" as const;
  }

  return "warning" as const;
}

function getAdminActionLabel(status: LoteGroup["status"]) {
  return status === "PENDENTE" ? "Conferir e decidir lote" : "Ver historico do lote";
}

function getUserActionLabel(status: LoteGroup["status"]) {
  return status === "DEVOLVIDO_PARA_CORRECAO" ? "Corrigir e reenviar" : "Ver detalhes do lote";
}

function getGroupHref(group: LoteGroup, role: "ADMIN_PLANEJAMENTO" | "USUARIO_SECRETARIA") {
  if (role === "USUARIO_SECRETARIA" && group.status === "DEVOLVIDO_PARA_CORRECAO") {
    return `/dashboard/remanejamentos?correctionOf=${group.id}`;
  }

  return `/dashboard/remanejamentos/${group.id}`;
}

function getCorrectionTag(linkage: { correctedFromLoteProtocolo: string | null; correctedByLoteProtocolo: string | null }) {
  if (linkage.correctedFromLoteProtocolo) {
    return `Corrige ${linkage.correctedFromLoteProtocolo}`;
  }

  if (linkage.correctedByLoteProtocolo) {
    return `Corrigido por ${linkage.correctedByLoteProtocolo}`;
  }

  return null;
}

function LoteItemPreview({ item }: { item: LoteItem }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Item {String(item.loteSequencia).padStart(2, "0")}</p>
      <div className="mt-3 space-y-1 text-sm text-slate-900">
        <p>
          Adicao: {item.destinoAcao} / {item.destinoFonte} / {item.destinoElemento}
        </p>
        <p>
          Anulacao: {item.origemAcao} / {item.origemFonte} / {item.origemElemento}
        </p>
        <p className="font-semibold">{formatCurrency(item.destinoValor.toString())}</p>
      </div>
    </div>
  );
}

export default async function RemanejamentosPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession();
  const params = await searchParams;
  const term = typeof params.q === "string" ? params.q.trim().toLowerCase() : "";
  const statusFilter = typeof params.status === "string" ? params.status : "";
  const correctionOf = typeof params.correctionOf === "string" ? params.correctionOf : "";

  const remanejamentos = await listRemanejamentos({
    role: session.user.role,
    userId: session.user.id,
    secretariaId: session.user.secretariaId,
  });

  const grouped = groupRemanejamentosByLote(remanejamentos);
  const filteredGroups = grouped.filter((group) => {
    const matchesTerm =
      !term ||
      [
        group.loteProtocolo,
        group.nomeSecretaria,
        group.nomeSolicitante,
        group.cpfSolicitante,
        ...group.itens.flatMap((item) => [
          item.destinoAcao,
          item.destinoFonte,
          item.destinoElemento,
          item.origemAcao,
          item.origemFonte,
          item.origemElemento,
        ]),
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);

    const matchesStatus = !statusFilter || group.status === statusFilter;
    return matchesTerm && matchesStatus;
  });

  const pendingCount = filteredGroups.filter((item) => item.status === "PENDENTE").length;
  const correctionPreset =
    session.user.role === "USUARIO_SECRETARIA" && correctionOf
      ? await getRemanejamentoCorrectionPreset(correctionOf, session.user.id)
      : null;
  const linkageLogs = filteredGroups.length
    ? await prisma.auditLog.findMany({
        where: {
          entity: "LoteRemanejamento",
          entityId: {
            in: filteredGroups.map((group) => group.loteProtocolo),
          },
          action: {
            in: ["CREATE_BATCH", "RESUBMIT_FOR_CORRECTION"],
          },
        },
        orderBy: {
          timestamp: "asc",
        },
      })
    : [];
  const correctionLinkageMap = getRemanejamentoCorrectionLinkageMap(
    filteredGroups.map((group) => group.loteProtocolo),
    linkageLogs,
  );

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      secretaria: true,
      secretariasVinculadas: {
        include: {
          secretaria: {
            include: {
              catalogItems: {
                orderBy: [{ acao: "asc" }, { fonte: "asc" }, { elemento: "asc" }],
              },
            },
          },
        },
        orderBy: {
          secretaria: {
            codigo: "asc",
          },
        },
      },
    },
  });

  const secretariasOperacionais =
    user?.secretariasVinculadas
      .map((item) => item.secretaria)
      .filter((item) => item.statusAtivo)
      .map((item) => ({
        id: item.id,
        nomeSecretaria: item.nomeSecretaria,
        unidadeOrcamentaria: item.unidadeOrcamentaria,
        nomeSecretario: item.nomeSecretario,
        isDefault: item.id === user.secretariaId,
        catalog: item.catalogItems.map((catalogItem) => ({
          id: catalogItem.id,
          acao: catalogItem.acao,
          fonte: catalogItem.fonte,
          elemento: catalogItem.elemento,
        })),
      })) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operacao"
        title="Gestao das solicitacoes de remanejamento"
        description="Acompanhe lotes e solicitacoes individuais, envie novos remanejamentos com catalogo por unidade orcamentaria e consulte os detalhes sem sobrecarregar a leitura da tela."
        aside={
          <div className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
              <p className="text-sm text-white/70">Lotes visiveis</p>
              <p className="mt-2 text-2xl font-semibold text-white">{filteredGroups.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
              <p className="text-sm text-white/70">Pendencias prioritarias</p>
              <p className="mt-2 text-base font-semibold text-white">{pendingCount} aguardando acao</p>
            </div>
          </div>
        }
      />

      {session.user.role === "USUARIO_SECRETARIA" ? (
        <RemanejamentoForm correctionPreset={correctionPreset} draftScopeKey={session.user.id} secretarias={secretariasOperacionais} />
      ) : null}

      <Card className="border-white/70 bg-white/92">
        <CardTitle>Lotes e solicitacoes registradas</CardTitle>
        <CardDescription className="mt-2">
          {session.user.role === "ADMIN_PLANEJAMENTO"
            ? "Visao global com foco em lotes, volume financeiro, conferencia previa e linha do tempo institucional."
            : "Historico restrito as solicitacoes do usuario autenticado, agrupado por lote quando houver multiplos itens."}
        </CardDescription>

        <form className="mt-6 grid gap-4 rounded-[1.5rem] border bg-muted/35 p-4 md:grid-cols-[1.2fr,0.6fr,auto]">
          <div className="space-y-2">
            <Label htmlFor="q">Buscar por protocolo, CPF, solicitante, secretaria ou item orcamentario</Label>
            <Input defaultValue={term} id="q" name="q" placeholder="Digite para localizar rapidamente" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              defaultValue={statusFilter}
              id="status"
              name="status"
              options={[
                { value: "PENDENTE", label: "Pendente" },
                { value: "DEVOLVIDO_PARA_CORRECAO", label: "Devolvido para correcao" },
                { value: "REALIZADO", label: "Realizado" },
                { value: "CANCELADO", label: "Cancelado" },
              ]}
              placeholder="Todos"
            />
          </div>
          <div className="flex items-end gap-3">
            <Button className="w-full md:w-auto" type="submit">
              Aplicar
            </Button>
          </div>
        </form>

        {filteredGroups.length ? (
          <>
            <div className="mt-6 hidden overflow-x-auto rounded-[1.5rem] border bg-white lg:block">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/55">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Lote</th>
                    <th className="px-4 py-3 text-left font-semibold">Data da solicitacao</th>
                    <th className="px-4 py-3 text-left font-semibold">Secretaria</th>
                    <th className="px-4 py-3 text-left font-semibold">Unidade</th>
                    <th className="px-4 py-3 text-left font-semibold">Solicitante</th>
                    <th className="px-4 py-3 text-left font-semibold">Itens</th>
                    <th className="px-4 py-3 text-left font-semibold">Valor total</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Acao</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGroups.map((group) => {
                    const previewItems = group.itens.slice(0, 2);
                    const remainingItems = group.itens.slice(2);

                    return (
                      <tr key={group.loteProtocolo} className="border-t align-top">
                        <td className="px-4 py-3 font-medium">
                          <div className="space-y-2">
                            <p>{group.loteProtocolo}</p>
                            {getCorrectionTag(correctionLinkageMap[group.loteProtocolo] ?? { correctedFromLoteProtocolo: null, correctedByLoteProtocolo: null }) ? (
                              <p className="max-w-[220px] rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">
                                {getCorrectionTag(
                                  correctionLinkageMap[group.loteProtocolo] ?? {
                                    correctedFromLoteProtocolo: null,
                                    correctedByLoteProtocolo: null,
                                  },
                                )}
                              </p>
                            ) : null}
                            <p className="text-xs text-muted-foreground">
                              {group.totalItens} {group.totalItens === 1 ? "item" : "itens"}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3">{group.dataSolicitacao.toLocaleDateString("pt-BR")}</td>
                        <td className="px-4 py-3">{group.nomeSecretaria}</td>
                        <td className="px-4 py-3">{formatGovernmentCode(group.unidadeOrcamentaria)}</td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <p>{group.nomeSolicitante}</p>
                            <p className="text-xs text-muted-foreground">{formatCpf(group.cpfSolicitante)}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-2">
                            {previewItems.map((item) => (
                              <LoteItemPreview key={item.id} item={item} />
                            ))}

                            {remainingItems.length ? (
                              <details className="group">
                                <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                                  <span className="group-open:hidden">Ver mais {remainingItems.length} itens</span>
                                  <span className="hidden group-open:inline">Ver menos</span>
                                </summary>
                                <div className="mt-2 space-y-2">
                                  {remainingItems.map((item) => (
                                    <LoteItemPreview key={item.id} item={item} />
                                  ))}
                                </div>
                              </details>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold">{formatCurrency(group.valorTotal)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={getStatusBadgeVariant(group.status)}>{group.status}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Link className="block" href={getGroupHref(group, session.user.role)}>
                            <Button className="h-auto w-full whitespace-normal py-2 text-center leading-5" size="sm" type="button">
                              {session.user.role === "ADMIN_PLANEJAMENTO" ? getAdminActionLabel(group.status) : getUserActionLabel(group.status)}
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-6 grid gap-4 lg:hidden">
              {filteredGroups.map((group) => {
                const previewItems = group.itens.slice(0, 2);
                const remainingItems = group.itens.slice(2);

                return (
                  <div key={group.loteProtocolo} className="rounded-[1.5rem] border bg-white p-5 shadow-sm">
                    {(() => {
                      const correctionTag = getCorrectionTag(
                        correctionLinkageMap[group.loteProtocolo] ?? {
                          correctedFromLoteProtocolo: null,
                          correctedByLoteProtocolo: null,
                        },
                      );

                      return correctionTag ? (
                        <div className="mb-3 inline-flex max-w-full rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">
                          <span className="truncate">{correctionTag}</span>
                        </div>
                      ) : null;
                    })()}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Lote</p>
                        <p className="mt-1 text-lg font-semibold">{group.loteProtocolo}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {group.totalItens} {group.totalItens === 1 ? "item" : "itens"}
                        </p>
                      </div>
                      <Badge variant={getStatusBadgeVariant(group.status)}>{group.status}</Badge>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Secretaria</p>
                        <p className="mt-1 text-sm">{group.nomeSecretaria}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Unidade</p>
                        <p className="mt-1 text-sm">{formatGovernmentCode(group.unidadeOrcamentaria)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Solicitante</p>
                        <p className="mt-1 text-sm">{group.nomeSolicitante}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Valor total</p>
                        <p className="mt-1 text-sm font-semibold">{formatCurrency(group.valorTotal)}</p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {previewItems.map((item) => (
                        <LoteItemPreview key={item.id} item={item} />
                      ))}

                      {remainingItems.length ? (
                        <details className="group">
                          <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                            <span className="group-open:hidden">Ver mais {remainingItems.length} itens</span>
                            <span className="hidden group-open:inline">Ver menos</span>
                          </summary>
                          <div className="mt-3 space-y-3">
                            {remainingItems.map((item) => (
                              <LoteItemPreview key={item.id} item={item} />
                            ))}
                          </div>
                        </details>
                      ) : null}
                    </div>

                    <div className="mt-4">
                      <StatusTimeline
                        status={group.status}
                        createdAtLabel={group.dataSolicitacao.toLocaleDateString("pt-BR")}
                        executedAtLabel={group.dataConclusao?.toLocaleDateString("pt-BR") ?? null}
                      />
                    </div>

                    <div className="mt-4">
                      <Link className="block sm:inline-block" href={getGroupHref(group, session.user.role)}>
                        <Button className="h-auto w-full whitespace-normal py-2 text-center leading-5 sm:w-auto" size="sm" type="button">
                          {session.user.role === "ADMIN_PLANEJAMENTO" ? getAdminActionLabel(group.status) : getUserActionLabel(group.status)}
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="mt-6">
            <EmptyState
              title="Nenhum lote encontrado"
              description="Ajuste os filtros de busca ou registre uma nova solicitacao para iniciar o fluxo de remanejamento."
            />
          </div>
        )}
      </Card>
    </div>
  );
}

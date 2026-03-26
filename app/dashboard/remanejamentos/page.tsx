import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusTimeline } from "@/components/shared/status-timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { RemanejamentoForm } from "@/features/remanejamentos/remanejamento-form";
import { prisma } from "@/lib/prisma";
import { formatCpf, formatCurrency, formatGovernmentCode } from "@/lib/utils";
import { groupRemanejamentosByLote, listRemanejamentos } from "@/services/remanejamento.service";
import { requireSession } from "@/services/authorization.service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function RemanejamentosPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession();
  const params = await searchParams;
  const term = typeof params.q === "string" ? params.q.trim().toLowerCase() : "";
  const statusFilter = typeof params.status === "string" ? params.status : "";

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
        eyebrow="Operação"
        title="Gestão das solicitações de remanejamento"
        description="Acompanhe lotes e solicitações individuais, envie novos remanejamentos com catálogo por unidade orçamentária, monitore a linha do tempo operacional e execute pendências quando estiver no perfil administrativo."
        aside={
          <div className="space-y-3">
            <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
              <p className="text-sm text-white/70">Lotes visíveis</p>
              <p className="mt-2 text-2xl font-semibold">{filteredGroups.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
              <p className="text-sm text-white/70">Pendências prioritárias</p>
              <p className="mt-2 text-base font-semibold">{pendingCount} aguardando ação</p>
            </div>
          </div>
        }
      />

      {session.user.role === "USUARIO_SECRETARIA" ? <RemanejamentoForm secretarias={secretariasOperacionais} /> : null}

      <Card className="border-white/70 bg-white/92">
        <CardTitle>Lotes e solicitações registradas</CardTitle>
        <CardDescription className="mt-2">
          {session.user.role === "ADMIN_PLANEJAMENTO"
            ? "Visão global com foco em lotes, volume financeiro, conferência prévia e linha do tempo institucional."
            : "Histórico restrito às solicitações do usuário autenticado, agrupado por lote quando houver múltiplos itens."}
        </CardDescription>

        <form className="mt-6 grid gap-4 rounded-[1.5rem] border bg-muted/35 p-4 md:grid-cols-[1.2fr,0.6fr,auto]">
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="q">
              Buscar por protocolo, CPF, solicitante, secretaria ou item orçamentário
            </label>
            <input
              className="h-11 w-full rounded-xl border bg-white px-3 text-sm"
              defaultValue={term}
              id="q"
              name="q"
              placeholder="Digite para localizar rapidamente"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="status">
              Status
            </label>
            <select className="h-11 w-full rounded-xl border bg-white px-3 text-sm" defaultValue={statusFilter} id="status" name="status">
              <option value="">Todos</option>
              <option value="PENDENTE">Pendente</option>
              <option value="REALIZADO">Realizado</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </div>
          <div className="flex items-end gap-3">
            <Button type="submit">Aplicar</Button>
          </div>
        </form>

        {filteredGroups.length ? (
          <>
            <div className="mt-6 hidden overflow-x-auto rounded-[1.5rem] border bg-white lg:block">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/55">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Lote</th>
                    <th className="px-4 py-3 text-left font-semibold">Data da solicitação</th>
                    <th className="px-4 py-3 text-left font-semibold">Secretaria</th>
                    <th className="px-4 py-3 text-left font-semibold">Unidade</th>
                    <th className="px-4 py-3 text-left font-semibold">Solicitante</th>
                    <th className="px-4 py-3 text-left font-semibold">Itens</th>
                    <th className="px-4 py-3 text-left font-semibold">Valor total</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    {session.user.role === "ADMIN_PLANEJAMENTO" ? (
                      <th className="px-4 py-3 text-left font-semibold">Ação</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {filteredGroups.map((group) => (
                    <tr key={group.loteProtocolo} className="border-t align-top">
                      <td className="px-4 py-3 font-medium">
                        <div className="space-y-2">
                          <p>{group.loteProtocolo}</p>
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
                          {group.itens.slice(0, 2).map((item) => (
                            <div
                              key={item.id}
                              className="min-w-[220px] rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3"
                            >
                              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                                Item {String(item.loteSequencia).padStart(2, "0")}
                              </p>
                              <div className="mt-2 space-y-1 text-sm text-slate-900">
                                <p>
                                  Adição: {item.destinoAcao} / {item.destinoFonte} / {item.destinoElemento}
                                </p>
                                <p>
                                  Anulação: {item.origemAcao} / {item.origemFonte} / {item.origemElemento}
                                </p>
                              </div>
                            </div>
                          ))}
                          {group.totalItens > 2 ? (
                            <p className="text-xs font-medium text-primary">+{group.totalItens - 2} itens no lote</p>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(group.valorTotal)}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            group.status === "REALIZADO" ? "success" : group.status === "CANCELADO" ? "danger" : "warning"
                          }
                        >
                          {group.status}
                        </Badge>
                      </td>
                      {session.user.role === "ADMIN_PLANEJAMENTO" ? (
                        <td className="px-4 py-3">
                          <Link className="block" href={`/dashboard/remanejamentos/${group.id}`}>
                            <Button className="h-auto w-full whitespace-normal py-2 text-center leading-5" size="sm" type="button">
                              {group.status === "PENDENTE" ? "Conferir e confirmar lote" : "Ver histórico do lote"}
                            </Button>
                          </Link>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 grid gap-4 lg:hidden">
              {filteredGroups.map((group) => (
                <div key={group.loteProtocolo} className="rounded-[1.5rem] border bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Lote</p>
                      <p className="mt-1 text-lg font-semibold">{group.loteProtocolo}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {group.totalItens} {group.totalItens === 1 ? "item" : "itens"}
                      </p>
                    </div>
                    <Badge
                      variant={
                        group.status === "REALIZADO" ? "success" : group.status === "CANCELADO" ? "danger" : "warning"
                      }
                    >
                      {group.status}
                    </Badge>
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
                    {group.itens.map((item) => (
                      <div key={item.id} className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Item {String(item.loteSequencia).padStart(2, "0")}
                        </p>
                        <div className="mt-3 space-y-1 text-sm text-slate-900">
                          <p>
                            Adição: {item.destinoAcao} / {item.destinoFonte} / {item.destinoElemento}
                          </p>
                          <p>
                            Anulação: {item.origemAcao} / {item.origemFonte} / {item.origemElemento}
                          </p>
                          <p className="font-semibold">{formatCurrency(item.destinoValor.toString())}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4">
                    <StatusTimeline
                      status={group.status}
                      createdAtLabel={group.dataSolicitacao.toLocaleDateString("pt-BR")}
                      executedAtLabel={group.dataConclusao?.toLocaleDateString("pt-BR") ?? null}
                    />
                  </div>

                  {session.user.role === "ADMIN_PLANEJAMENTO" ? (
                    <div className="mt-4">
                      <Link className="block sm:inline-block" href={`/dashboard/remanejamentos/${group.id}`}>
                        <Button className="h-auto w-full whitespace-normal py-2 text-center leading-5 sm:w-auto" size="sm" type="button">
                          {group.status === "PENDENTE" ? "Conferir e confirmar lote" : "Ver histórico do lote"}
                        </Button>
                      </Link>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="mt-6">
            <EmptyState
              title="Nenhum lote encontrado"
              description="Ajuste os filtros de busca ou registre uma nova solicitação para iniciar o fluxo de remanejamento."
            />
          </div>
        )}
      </Card>
    </div>
  );
}

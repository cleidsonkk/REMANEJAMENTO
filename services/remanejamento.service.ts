import { type AuditLog, type Prisma, RemanejamentoStatus, type Remanejamento } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { endOfDayInTimeZone, startOfDayInTimeZone } from "@/lib/timezone";
import { executadosFilterSchema, type ExecutadosFilterInput } from "@/lib/validations/executados";

type ListedRemanejamento = Awaited<ReturnType<typeof listRemanejamentos>>[number];

export type RemanejamentoGroup = {
  id: string;
  loteProtocolo: string;
  status: RemanejamentoStatus;
  dataSolicitacao: Date;
  dataConclusao: Date | null;
  secretariaId: string;
  nomeSecretaria: string;
  unidadeOrcamentaria: string;
  nomeSecretario: string;
  nomeSolicitante: string;
  cpfSolicitante: string;
  justificativa: string;
  totalItens: number;
  valorTotal: number;
  itens: ListedRemanejamento[];
};

export type TimelineEvent = {
  id: string;
  label: string;
  detail: string;
  tone: "done" | "current" | "pending";
  timestamp: Date | null;
};

export async function listRemanejamentos(args: {
  role: "ADMIN_PLANEJAMENTO" | "USUARIO_SECRETARIA";
  userId: string;
  secretariaId?: string | null;
}) {
  return prisma.remanejamento.findMany({
    where:
      args.role === "ADMIN_PLANEJAMENTO"
        ? undefined
        : {
            solicitanteId: args.userId,
          },
    orderBy: [{ dataSolicitacao: "desc" }, { loteSequencia: "asc" }, { createdAt: "desc" }],
  });
}

export function groupRemanejamentosByLote(items: ListedRemanejamento[]) {
  const groups = new Map<string, RemanejamentoGroup>();

  for (const item of items) {
    const loteProtocolo = item.loteProtocolo ?? item.protocolo;
    const existing = groups.get(loteProtocolo);

    if (!existing) {
      groups.set(loteProtocolo, {
        id: item.id,
        loteProtocolo,
        status: item.status,
        dataSolicitacao: item.dataSolicitacao,
        dataConclusao: item.dataConclusao,
        secretariaId: item.secretariaId,
        nomeSecretaria: item.nomeSecretaria,
        unidadeOrcamentaria: item.unidadeOrcamentaria,
        nomeSecretario: item.nomeSecretario,
        nomeSolicitante: item.nomeSolicitante,
        cpfSolicitante: item.cpfSolicitante,
        justificativa: item.justificativa,
        totalItens: 1,
        valorTotal: Number(item.destinoValor),
        itens: [item],
      });
      continue;
    }

    existing.totalItens += 1;
    existing.valorTotal += Number(item.destinoValor);
    existing.itens.push(item);
    existing.dataSolicitacao = item.dataSolicitacao < existing.dataSolicitacao ? item.dataSolicitacao : existing.dataSolicitacao;
    existing.dataConclusao =
      existing.dataConclusao && item.dataConclusao
        ? item.dataConclusao > existing.dataConclusao
          ? item.dataConclusao
          : existing.dataConclusao
        : existing.dataConclusao ?? item.dataConclusao;

    if (existing.status !== item.status) {
      existing.status =
        existing.itens.some((entry) => entry.status === "PENDENTE") || item.status === "PENDENTE"
          ? RemanejamentoStatus.PENDENTE
          : existing.itens.some((entry) => entry.status === "CANCELADO") || item.status === "CANCELADO"
            ? RemanejamentoStatus.CANCELADO
            : RemanejamentoStatus.REALIZADO;
    }
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      itens: [...group.itens].sort((a, b) => a.loteSequencia - b.loteSequencia),
    }))
    .sort((a, b) => b.dataSolicitacao.getTime() - a.dataSolicitacao.getTime());
}

export function buildExecutadosWhereClause(filters?: Partial<ExecutadosFilterInput>): Prisma.RemanejamentoExecutadoWhereInput {
  const parsed = executadosFilterSchema.parse(filters ?? {});

  const periodo =
    parsed.dataInicial || parsed.dataFinal
      ? {
          gte: parsed.dataInicial ? startOfDayInTimeZone(parsed.dataInicial) : undefined,
          lte: parsed.dataFinal ? endOfDayInTimeZone(parsed.dataFinal) : undefined,
        }
      : undefined;

  const camposOrcamentarios = [parsed.acao, parsed.fonte, parsed.elemento].some(Boolean)
    ? [
        parsed.acao
          ? {
              OR: [
                { adicaoAcao: { contains: parsed.acao, mode: "insensitive" } },
                { anulacaoAcao: { contains: parsed.acao, mode: "insensitive" } },
              ],
            }
          : undefined,
        parsed.fonte
          ? {
              OR: [
                { adicaoFonte: { contains: parsed.fonte, mode: "insensitive" } },
                { anulacaoFonte: { contains: parsed.fonte, mode: "insensitive" } },
              ],
            }
          : undefined,
        parsed.elemento
          ? {
              OR: [
                { adicaoElemento: { contains: parsed.elemento, mode: "insensitive" } },
                { anulacaoElemento: { contains: parsed.elemento, mode: "insensitive" } },
              ],
            }
          : undefined,
      ].filter(Boolean) as Prisma.RemanejamentoExecutadoWhereInput[]
    : [];

  return {
    secretaria: parsed.secretaria
      ? {
          contains: parsed.secretaria,
          mode: "insensitive",
        }
      : undefined,
    cpfSolicitante: parsed.cpf
      ? {
          contains: parsed.cpf.replace(/\D/g, ""),
        }
      : undefined,
    dataRemanejamento: periodo,
    AND: camposOrcamentarios.length ? camposOrcamentarios : undefined,
  };
}

export async function listRemanejamentosExecutados(filters?: Partial<ExecutadosFilterInput>) {
  return prisma.remanejamentoExecutado.findMany({
    where: buildExecutadosWhereClause(filters),
    orderBy: [{ dataRemanejamento: "desc" }, { loteSequencia: "asc" }],
  });
}

export async function getRemanejamentoById(id: string) {
  return prisma.remanejamento.findUnique({
    where: { id },
    include: {
      secretaria: true,
      solicitante: true,
      executado: true,
    },
  });
}

export async function getRemanejamentoGroupById(id: string) {
  const current = await prisma.remanejamento.findUnique({
    where: { id },
    include: {
      secretaria: true,
      solicitante: true,
      executado: true,
    },
  });

  if (!current) {
    return null;
  }

  const loteProtocolo = current.loteProtocolo ?? current.protocolo;
  const itens = await prisma.remanejamento.findMany({
    where: current.loteProtocolo
      ? {
          loteProtocolo,
        }
      : {
          id: current.id,
        },
    include: {
      executado: true,
    },
    orderBy: [{ loteSequencia: "asc" }, { createdAt: "asc" }],
  });

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entity: "LoteRemanejamento", entityId: loteProtocolo },
        {
          entity: "Remanejamento",
          entityId: {
            in: itens.map((item) => item.id),
          },
        },
      ],
    },
    orderBy: {
      timestamp: "asc",
    },
  });

  return {
    current,
    loteProtocolo,
    itens,
    auditLogs,
  };
}

function buildTimelineLabel(log: AuditLog) {
  if (log.entity === "LoteRemanejamento" && log.action === "CREATE_BATCH") {
    return "Lote registrado";
  }

  if (log.entity === "LoteRemanejamento" && log.action === "EXECUTE_BATCH") {
    return "Lote executado";
  }

  if (log.entity === "Remanejamento" && log.action === "CREATE") {
    return "Item adicionado ao lote";
  }

  if (log.entity === "Remanejamento" && log.action === "EXECUTE") {
    return "Item consolidado";
  }

  if (log.action === "UPDATE") {
    return "Registro atualizado";
  }

  return `${log.action} ${log.entity}`;
}

export function buildRemanejamentoTimeline(group: {
  loteProtocolo: string;
  status: RemanejamentoStatus;
  dataSolicitacao: Date;
  dataConclusao?: Date | null;
  itens: Array<Pick<Remanejamento, "loteSequencia">>;
  auditLogs: AuditLog[];
}) {
  const events: TimelineEvent[] = [
    {
      id: "created",
      label: "Solicitação registrada",
      detail: `${group.itens.length} ${group.itens.length === 1 ? "item" : "itens"} no lote ${group.loteProtocolo}`,
      tone: "done",
      timestamp: group.dataSolicitacao,
    },
    {
      id: "analysis",
      label: group.status === "PENDENTE" ? "Em análise administrativa" : "Análise concluída",
      detail:
        group.status === "PENDENTE"
          ? "Aguardando conferência final do Planejamento."
          : "Conferência técnica concluída pelo perfil administrativo.",
      tone: group.status === "PENDENTE" ? "current" : "done",
      timestamp: null,
    },
    {
      id: "execution",
      label: group.status === "REALIZADO" ? "Executado" : group.status === "CANCELADO" ? "Encerrado" : "Execução pendente",
      detail:
        group.status === "REALIZADO"
          ? "Lote consolidado no histórico executivo."
          : group.status === "CANCELADO"
            ? "Lote encerrado sem efetivação."
            : "Aguardando confirmação administrativa.",
      tone: group.status === "REALIZADO" ? "done" : group.status === "PENDENTE" ? "pending" : "done",
      timestamp: group.dataConclusao ?? null,
    },
  ];

  const auditEvents = group.auditLogs.map((log, index) => ({
    id: `${log.id}-${index}`,
    label: buildTimelineLabel(log),
    detail: log.entity === "LoteRemanejamento" ? group.loteProtocolo : "Operação registrada na auditoria institucional.",
    tone: "done" as const,
    timestamp: log.timestamp,
  }));

  return [...events, ...auditEvents].sort((a, b) => {
    if (!a.timestamp && !b.timestamp) {
      return 0;
    }

    if (!a.timestamp) {
      return -1;
    }

    if (!b.timestamp) {
      return 1;
    }

    return a.timestamp.getTime() - b.timestamp.getTime();
  });
}

export async function markAsExecuted(id: string) {
  return prisma.$transaction(async (tx) => {
    const found = await tx.remanejamento.findUnique({
      where: { id },
    });

    if (!found) {
      throw new Error("Solicitação não encontrada.");
    }

    const loteProtocolo = found.loteProtocolo ?? found.protocolo;
    const pendentes = await tx.remanejamento.findMany({
      where: found.loteProtocolo
        ? {
            loteProtocolo,
            status: RemanejamentoStatus.PENDENTE,
          }
        : {
            id: found.id,
            status: RemanejamentoStatus.PENDENTE,
          },
      orderBy: [{ loteSequencia: "asc" }, { createdAt: "asc" }],
    });

    if (!pendentes.length) {
      throw new Error("Solicitação não disponível para execução.");
    }

    const executedAt = new Date();
    const updatedItems: Remanejamento[] = [];

    for (const item of pendentes) {
      const updated = await tx.remanejamento.update({
        where: { id: item.id },
        data: {
          status: RemanejamentoStatus.REALIZADO,
          dataConclusao: executedAt,
        },
      });

      await tx.remanejamentoExecutado.create({
        data: {
          remanejamentoId: updated.id,
          protocolo: updated.protocolo,
          loteProtocolo: updated.loteProtocolo ?? updated.protocolo,
          loteSequencia: updated.loteSequencia,
          dataSolicitacao: updated.dataSolicitacao,
          dataRemanejamento: updated.dataConclusao ?? executedAt,
          secretaria: updated.nomeSecretaria,
          unidadeOrcamentaria: updated.unidadeOrcamentaria,
          nomeSecretario: updated.nomeSecretario,
          nomeSolicitante: updated.nomeSolicitante,
          cpfSolicitante: updated.cpfSolicitante,
          justificativa: updated.justificativa,
          adicaoAcao: updated.destinoAcao,
          adicaoFonte: updated.destinoFonte,
          adicaoElemento: updated.destinoElemento,
          adicaoValor: updated.destinoValor,
          anulacaoAcao: updated.origemAcao,
          anulacaoFonte: updated.origemFonte,
          anulacaoElemento: updated.origemElemento,
          anulacaoValor: updated.origemValor,
        },
      });

      updatedItems.push(updated);
    }

    return {
      loteProtocolo,
      itens: updatedItems,
    };
  });
}

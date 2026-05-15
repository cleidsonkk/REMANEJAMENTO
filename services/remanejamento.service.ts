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

export type RemanejamentoCorrectionPreset = {
  sourceId: string;
  loteProtocolo: string;
  secretariaId: string;
  justificativa: string;
  reason: string;
  entries: Array<{
    destinoAcao: string;
    destinoFonte: string;
    destinoElemento: string;
    destinoValor: string;
    origemAcao: string;
    origemFonte: string;
    origemElemento: string;
    origemValor: string;
  }>;
};

export type RemanejamentoCorrectionLinkage = {
  correctedFromLoteProtocolo: string | null;
  correctedByLoteProtocolo: string | null;
};

export type RemanejamentoCorrectionLinkageMap = Record<string, RemanejamentoCorrectionLinkage>;

export function getResubmittedCorrectionSourceLotes(logs: AuditLog[]) {
  const resolvedLotes = new Set<string>();

  for (const log of logs) {
    if (log.entity !== "LoteRemanejamento" || log.action !== "RESUBMIT_FOR_CORRECTION") {
      continue;
    }

    if (typeof log.entityId === "string" && log.entityId.trim()) {
      resolvedLotes.add(log.entityId.trim());
    }
  }

  return resolvedLotes;
}

function formatCorrectionCurrency(value: Prisma.Decimal | number) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

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
          : existing.itens.some((entry) => entry.status === "DEVOLVIDO_PARA_CORRECAO") || item.status === "DEVOLVIDO_PARA_CORRECAO"
            ? RemanejamentoStatus.DEVOLVIDO_PARA_CORRECAO
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

  if (log.entity === "LoteRemanejamento" && log.action === "RETURN_BATCH") {
    return "Lote devolvido para correcao";
  }

  if (log.entity === "LoteRemanejamento" && log.action === "CANCEL_BATCH") {
    return "Lote cancelado";
  }

  if (log.entity === "LoteRemanejamento" && log.action === "RESUBMIT_FOR_CORRECTION") {
    return "Correcao reenviada";
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

function getAuditReason(log: AuditLog) {
  if (!log.newData || typeof log.newData !== "object" || Array.isArray(log.newData)) {
    return null;
  }

  const reason = "reason" in log.newData ? log.newData.reason : null;
  return typeof reason === "string" && reason.trim() ? reason.trim() : null;
}

function getLatestAdministrativeDecision(logs: AuditLog[]) {
  const latestDecision = [...logs]
    .reverse()
    .find((log) => log.entity === "LoteRemanejamento" && (log.action === "RETURN_BATCH" || log.action === "CANCEL_BATCH"));

  if (!latestDecision) {
    return null;
  }

  return {
    action: latestDecision.action,
    reason: getAuditReason(latestDecision),
  };
}

export function getRemanejamentoCorrectionLinkage(
  currentLoteProtocolo: string,
  logs: AuditLog[],
): RemanejamentoCorrectionLinkage {
  let correctedFromLoteProtocolo: string | null = null;
  let correctedByLoteProtocolo: string | null = null;

  for (const log of logs) {
    if (!log.newData || typeof log.newData !== "object" || Array.isArray(log.newData)) {
      continue;
    }

    if (log.entity !== "LoteRemanejamento") {
      continue;
    }

    if (log.action === "CREATE_BATCH") {
      const sourceLote =
        "correctionSourceLoteProtocolo" in log.newData ? log.newData.correctionSourceLoteProtocolo : null;
      if (log.entityId === currentLoteProtocolo && typeof sourceLote === "string" && sourceLote.trim()) {
        correctedFromLoteProtocolo = sourceLote.trim();
      }
    }

    if (log.action === "RESUBMIT_FOR_CORRECTION") {
      const newLote = "novoLoteProtocolo" in log.newData ? log.newData.novoLoteProtocolo : null;
      if (log.entityId === currentLoteProtocolo && typeof newLote === "string" && newLote.trim()) {
        correctedByLoteProtocolo = newLote.trim();
      }
    }
  }

  return {
    correctedFromLoteProtocolo,
    correctedByLoteProtocolo,
  };
}

export function getRemanejamentoCorrectionLinkageMap(
  loteProtocolos: string[],
  logs: AuditLog[],
): RemanejamentoCorrectionLinkageMap {
  return Object.fromEntries(
    loteProtocolos.map((loteProtocolo) => [
      loteProtocolo,
      getRemanejamentoCorrectionLinkage(loteProtocolo, logs),
    ]),
  );
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
      label: "Solicitacao registrada",
      detail: `${group.itens.length} ${group.itens.length === 1 ? "item" : "itens"} no lote ${group.loteProtocolo}`,
      tone: "done",
      timestamp: group.dataSolicitacao,
    },
    {
      id: "analysis",
      label:
        group.status === "PENDENTE"
          ? "Em analise administrativa"
          : group.status === "DEVOLVIDO_PARA_CORRECAO"
            ? "Devolvido para correcao"
            : "Analise concluida",
      detail:
        group.status === "PENDENTE"
          ? "Aguardando conferencia final do Planejamento."
          : group.status === "DEVOLVIDO_PARA_CORRECAO"
            ? "Lote devolvido ao solicitante para ajuste e reenvio."
          : "Conferencia tecnica concluida pelo perfil administrativo.",
      tone: group.status === "PENDENTE" ? "current" : "done",
      timestamp: group.status === "DEVOLVIDO_PARA_CORRECAO" ? group.dataConclusao ?? null : null,
    },
    {
      id: "execution",
      label:
        group.status === "REALIZADO"
          ? "Executado"
          : group.status === "DEVOLVIDO_PARA_CORRECAO"
            ? "Aguardando nova solicitacao"
            : group.status === "CANCELADO"
              ? "Encerrado"
              : "Execucao pendente",
      detail:
        group.status === "REALIZADO"
          ? "Lote consolidado no historico executivo."
          : group.status === "DEVOLVIDO_PARA_CORRECAO"
            ? "A secretaria deve corrigir os dados e registrar um novo lote."
          : group.status === "CANCELADO"
            ? "Lote encerrado sem efetivacao."
            : "Aguardando confirmacao administrativa.",
      tone:
        group.status === "REALIZADO"
          ? "done"
          : group.status === "PENDENTE"
            ? "pending"
            : group.status === "DEVOLVIDO_PARA_CORRECAO"
              ? "pending"
              : "done",
      timestamp: group.status === "REALIZADO" || group.status === "CANCELADO" ? group.dataConclusao ?? null : null,
    },
  ];

  const auditEvents = group.auditLogs.map((log, index) => {
    const reason = getAuditReason(log);

    return {
      id: `${log.id}-${index}`,
      label: buildTimelineLabel(log),
      detail:
        log.entity === "LoteRemanejamento"
          ? reason
            ? `Motivo administrativo: ${reason}`
            : group.loteProtocolo
          : "Operacao registrada na auditoria institucional.",
      tone: "done" as const,
      timestamp: log.timestamp,
    };
  });

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
      throw new Error("Solicitacao nao encontrada.");
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
      throw new Error("Solicitacao nao disponivel para execucao.");
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

export async function markAsCancelled(id: string) {
  return prisma.$transaction(async (tx) => {
    const found = await tx.remanejamento.findUnique({
      where: { id },
    });

    if (!found) {
      throw new Error("Solicitacao nao encontrada.");
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
      throw new Error("Solicitacao nao disponivel para cancelamento.");
    }

    const cancelledAt = new Date();
    const updatedItems: Remanejamento[] = [];

    for (const item of pendentes) {
      const updated = await tx.remanejamento.update({
        where: { id: item.id },
        data: {
          status: RemanejamentoStatus.CANCELADO,
          dataConclusao: cancelledAt,
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

export async function markAsReturnedForCorrection(id: string) {
  return prisma.$transaction(async (tx) => {
    const found = await tx.remanejamento.findUnique({
      where: { id },
    });

    if (!found) {
      throw new Error("Solicitacao nao encontrada.");
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
      throw new Error("Solicitacao nao disponivel para devolucao.");
    }

    const returnedAt = new Date();
    const updatedItems: Remanejamento[] = [];

    for (const item of pendentes) {
      const updated = await tx.remanejamento.update({
        where: { id: item.id },
        data: {
          status: RemanejamentoStatus.DEVOLVIDO_PARA_CORRECAO,
          dataConclusao: returnedAt,
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

export async function getRemanejamentoCorrectionPreset(id: string, userId: string) {
  const group = await getRemanejamentoGroupById(id);

  if (!group || group.current.solicitanteId !== userId) {
    return null;
  }

  const hasPending = group.itens.some((item) => item.status === RemanejamentoStatus.PENDENTE);
  const hasReturned = group.itens.some((item) => item.status === RemanejamentoStatus.DEVOLVIDO_PARA_CORRECAO);

  if (hasPending || !hasReturned) {
    return null;
  }

  const decision = getLatestAdministrativeDecision(group.auditLogs);
  if (!decision?.reason || decision.action !== "RETURN_BATCH") {
    return null;
  }

  return {
    sourceId: group.current.id,
    loteProtocolo: group.loteProtocolo,
    secretariaId: group.current.secretariaId,
    justificativa: group.current.justificativa,
    reason: decision.reason,
    entries: group.itens.map((item) => ({
      destinoAcao: item.destinoAcao,
      destinoFonte: item.destinoFonte,
      destinoElemento: item.destinoElemento,
      destinoValor: formatCorrectionCurrency(item.destinoValor),
      origemAcao: item.origemAcao,
      origemFonte: item.origemFonte,
      origemElemento: item.origemElemento,
      origemValor: formatCorrectionCurrency(item.origemValor),
    })),
  } satisfies RemanejamentoCorrectionPreset;
}

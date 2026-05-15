import { RemanejamentoStatus, UserRole } from "@prisma/client";
import { subMonths } from "date-fns";

import { prisma } from "@/lib/prisma";
import { getResubmittedCorrectionSourceLotes } from "@/services/remanejamento.service";

export async function getDashboardData(userId: string, role: UserRole, secretariaId?: string | null) {
  const where =
    role === "ADMIN_PLANEJAMENTO"
      ? {}
      : {
          solicitanteId: userId,
          secretariaId: secretariaId ?? undefined,
        };

  const [stats, monthSeries, secretarias, totalExecutado, devolvidosParaCorrecao, correctionAuditLogs] = await Promise.all([
    prisma.remanejamento.groupBy({
      by: ["status"],
      _count: true,
      where,
    }),
    prisma.remanejamento.findMany({
      where: {
        ...where,
        createdAt: {
          gte: subMonths(new Date(), 5),
        },
      },
      select: {
        createdAt: true,
        destinoValor: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
    prisma.remanejamento.groupBy({
      by: ["nomeSecretaria"],
      _count: true,
      _sum: {
        destinoValor: true,
      },
      where: role === "ADMIN_PLANEJAMENTO" ? {} : { secretariaId: secretariaId ?? undefined },
      orderBy: {
        _count: {
          nomeSecretaria: "desc",
        },
      },
      take: 6,
    }),
    prisma.remanejamento.aggregate({
      where,
      _sum: {
        destinoValor: true,
      },
    }),
    prisma.remanejamento.findMany({
      where: {
        ...where,
        status: RemanejamentoStatus.DEVOLVIDO_PARA_CORRECAO,
      },
      select: {
        id: true,
        loteProtocolo: true,
        protocolo: true,
      },
    }),
    prisma.auditLog.findMany({
      where: {
        entity: "LoteRemanejamento",
        action: "RESUBMIT_FOR_CORRECTION",
      },
      select: {
        id: true,
        userId: true,
        action: true,
        entity: true,
        entityId: true,
        oldData: true,
        newData: true,
        timestamp: true,
      },
    }),
  ]);

  const kpiMap = {
    total: 0,
    pendentes: 0,
    devolvidasParaCorrecao: 0,
    realizadas: 0,
    canceladas: 0,
  };

  for (const stat of stats) {
    kpiMap.total += stat._count;
    if (stat.status === RemanejamentoStatus.PENDENTE) {
      kpiMap.pendentes = stat._count;
    }
    if (stat.status === RemanejamentoStatus.REALIZADO) {
      kpiMap.realizadas = stat._count;
    }
    if (stat.status === RemanejamentoStatus.CANCELADO) {
      kpiMap.canceladas = stat._count;
    }
  }

  const resolvedCorrectionLotes = getResubmittedCorrectionSourceLotes(correctionAuditLogs as never);
  kpiMap.devolvidasParaCorrecao = devolvidosParaCorrecao.filter((item) => {
    const loteProtocolo = item.loteProtocolo ?? item.protocolo;
    return !resolvedCorrectionLotes.has(loteProtocolo);
  }).length;

  const groupedByMonth = new Map<string, number>();
  for (const item of monthSeries) {
    const month = item.createdAt.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
    groupedByMonth.set(month, (groupedByMonth.get(month) ?? 0) + Number(item.destinoValor));
  }

  return {
    kpis: kpiMap,
    volumeFinanceiro: Number(totalExecutado._sum.destinoValor ?? 0),
    monthSeries: Array.from(groupedByMonth.entries()).map(([mes, valor]) => ({ mes, valor })),
    secretarias: secretarias.map((item) => ({
      secretaria: item.nomeSecretaria,
      quantidade: item._count,
      valor: Number(item._sum.destinoValor ?? 0),
    })),
  };
}

import { RemanejamentoStatus, UserRole } from "@prisma/client";
import { subMonths } from "date-fns";

import { prisma } from "@/lib/prisma";

export async function getDashboardData(userId: string, role: UserRole, secretariaId?: string | null) {
  const where =
    role === "ADMIN_PLANEJAMENTO"
      ? {}
      : {
          solicitanteId: userId,
          secretariaId: secretariaId ?? undefined,
        };

  const [stats, monthSeries, secretarias, totalExecutado] = await Promise.all([
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
    if (stat.status === RemanejamentoStatus.DEVOLVIDO_PARA_CORRECAO) {
      kpiMap.devolvidasParaCorrecao = stat._count;
    }
    if (stat.status === RemanejamentoStatus.REALIZADO) {
      kpiMap.realizadas = stat._count;
    }
    if (stat.status === RemanejamentoStatus.CANCELADO) {
      kpiMap.canceladas = stat._count;
    }
  }

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

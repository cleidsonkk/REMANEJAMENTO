import { prisma } from "@/lib/prisma";

export async function listSecretarias(activeOnly = false, search?: string) {
  return prisma.secretaria.findMany({
    where: {
      ...(activeOnly ? { statusAtivo: true } : {}),
      ...(search
        ? {
            OR: [
              { nomeSecretaria: { contains: search, mode: "insensitive" } },
              { nomeSecretario: { contains: search, mode: "insensitive" } },
              { unidadeOrcamentaria: { contains: search.replace(/\D/g, "") } },
            ],
          }
        : {}),
    },
    include: {
      _count: {
        select: {
          userLinks: true,
          catalogItems: true,
        },
      },
    },
    orderBy: [{ codigo: "asc" }, { nomeSecretaria: "asc" }],
  });
}

export async function getSecretariaCatalog(secretariaId: string) {
  return prisma.secretariaCatalogItem.findMany({
    where: { secretariaId },
    orderBy: [{ acao: "asc" }, { fonte: "asc" }, { elemento: "asc" }],
  });
}

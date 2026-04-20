import { Prisma } from "@prisma/client";

import { createPaginatedResult, getPaginationState } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

function buildSecretariaWhere(activeOnly = false, search?: string): Prisma.SecretariaWhereInput {
  return {
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
  };
}

const secretariaInclude = {
  _count: {
    select: {
      userLinks: true,
      catalogItems: true,
    },
  },
} satisfies Prisma.SecretariaInclude;

export async function listSecretarias(activeOnly = false, search?: string) {
  return prisma.secretaria.findMany({
    where: buildSecretariaWhere(activeOnly, search),
    include: secretariaInclude,
    orderBy: [{ codigo: "asc" }, { nomeSecretaria: "asc" }],
  });
}

export async function listSecretariasPage({
  activeOnly = false,
  page = 1,
  pageSize = 10,
  search,
}: {
  activeOnly?: boolean;
  page?: number;
  pageSize?: number;
  search?: string;
}) {
  const where = buildSecretariaWhere(activeOnly, search);
  const total = await prisma.secretaria.count({ where });
  const pagination = getPaginationState({ page, pageSize, total });
  const items = await prisma.secretaria.findMany({
    where,
    include: secretariaInclude,
    orderBy: [{ codigo: "asc" }, { nomeSecretaria: "asc" }],
    skip: pagination.skip,
    take: pagination.pageSize,
  });

  return createPaginatedResult(items, pagination);
}

export async function listActiveSecretariaOptions() {
  return prisma.secretaria.findMany({
    where: {
      statusAtivo: true,
    },
    select: {
      id: true,
      nomeSecretaria: true,
      unidadeOrcamentaria: true,
    },
    orderBy: [{ codigo: "asc" }, { nomeSecretaria: "asc" }],
  });
}

export async function getSecretariaById(secretariaId: string) {
  return prisma.secretaria.findUnique({
    where: { id: secretariaId },
    include: secretariaInclude,
  });
}

export async function getSecretariaCatalog(secretariaId: string) {
  return prisma.secretariaCatalogItem.findMany({
    where: { secretariaId },
    orderBy: [{ acao: "asc" }, { fonte: "asc" }, { elemento: "asc" }],
  });
}

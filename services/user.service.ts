import { Prisma } from "@prisma/client";

import { createPaginatedResult, getPaginationState } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

function buildUserWhere(search?: string): Prisma.UserWhereInput | undefined {
  if (!search) {
    return undefined;
  }

  return {
    OR: [
      { nome: { contains: search, mode: "insensitive" } },
      { cpf: { contains: search.replace(/\D/g, "") } },
      { email: { contains: search, mode: "insensitive" } },
      { secretaria: { nomeSecretaria: { contains: search, mode: "insensitive" } } },
      {
        secretariasVinculadas: {
          some: {
            secretaria: {
              nomeSecretaria: { contains: search, mode: "insensitive" },
            },
          },
        },
      },
    ],
  };
}

const userInclude = {
  secretaria: true,
  secretariasVinculadas: {
    include: {
      secretaria: true,
    },
    orderBy: {
      secretaria: {
        codigo: "asc",
      },
    },
  },
} satisfies Prisma.UserInclude;

export async function listUsers(search?: string) {
  return prisma.user.findMany({
    where: buildUserWhere(search),
    include: userInclude,
    orderBy: {
      nome: "asc",
    },
  });
}

export async function listUsersPage({
  page = 1,
  pageSize = 10,
  search,
}: {
  page?: number;
  pageSize?: number;
  search?: string;
}) {
  const where = buildUserWhere(search);
  const total = await prisma.user.count({ where });
  const pagination = getPaginationState({ page, pageSize, total });
  const items = await prisma.user.findMany({
    where,
    include: userInclude,
    orderBy: {
      nome: "asc",
    },
    skip: pagination.skip,
    take: pagination.pageSize,
  });

  return createPaginatedResult(items, pagination);
}

export async function listUsersForSelect() {
  return prisma.user.findMany({
    select: {
      id: true,
      nome: true,
      cpf: true,
    },
    orderBy: {
      nome: "asc",
    },
  });
}

export async function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: userInclude,
  });
}

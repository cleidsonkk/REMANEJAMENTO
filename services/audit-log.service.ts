import { Prisma } from "@prisma/client";

import { createPaginatedResult, getPaginationState } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

function buildAuditLogWhere({
  action,
  entity,
  search,
}: {
  action?: string;
  entity?: string;
  search?: string;
}): Prisma.AuditLogWhereInput {
  return {
    action: action || undefined,
    entity: entity || undefined,
    OR: search
      ? [
          { action: { contains: search, mode: "insensitive" } },
          { entity: { contains: search, mode: "insensitive" } },
          { entityId: { contains: search, mode: "insensitive" } },
          { user: { is: { nome: { contains: search, mode: "insensitive" } } } },
        ]
      : undefined,
  };
}

export async function listAuditLogsPage({
  action,
  entity,
  page = 1,
  pageSize = 20,
  search,
}: {
  action?: string;
  entity?: string;
  page?: number;
  pageSize?: number;
  search?: string;
}) {
  const where = buildAuditLogWhere({ action, entity, search });
  const total = await prisma.auditLog.count({ where });
  const pagination = getPaginationState({ page, pageSize, total });
  const items = await prisma.auditLog.findMany({
    include: { user: true },
    where,
    orderBy: { timestamp: "desc" },
    skip: pagination.skip,
    take: pagination.pageSize,
  });

  return createPaginatedResult(items, pagination);
}

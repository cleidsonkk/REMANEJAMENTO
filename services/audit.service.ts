import { prisma } from "@/lib/prisma";

type AuditPayload = {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string;
  oldData?: unknown;
  newData?: unknown;
};

export async function createAuditLog(payload: AuditPayload) {
  await prisma.auditLog.create({
    data: {
      userId: payload.userId ?? null,
      action: payload.action,
      entity: payload.entity,
      entityId: payload.entityId,
      oldData: payload.oldData as never,
      newData: payload.newData as never,
    },
  });
}

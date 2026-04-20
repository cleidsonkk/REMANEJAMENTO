import { Prisma, UserRole, UserStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type NotificationListItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: Date;
  relatedEntity: string | null;
  relatedEntityId: string | null;
};

function isNotificationTableMissingError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021";
}

export async function createNotification(args: {
  userId: string;
  title: string;
  message: string;
  type: string;
  relatedEntity?: string | null;
  relatedEntityId?: string | null;
}) {
  try {
    return await prisma.notification.create({
      data: {
        userId: args.userId,
        title: args.title,
        message: args.message,
        type: args.type,
        relatedEntity: args.relatedEntity ?? null,
        relatedEntityId: args.relatedEntityId ?? null,
      },
    });
  } catch (error) {
    if (isNotificationTableMissingError(error)) {
      return null;
    }

    throw error;
  }
}

export async function notifyAdminsAboutCreatedBatch(args: {
  loteProtocolo: string;
  secretariaNome: string;
  solicitanteNome: string;
  totalItens: number;
  actorUserId?: string;
}) {
  const admins = await prisma.user.findMany({
    where: {
      role: UserRole.ADMIN_PLANEJAMENTO,
      status: UserStatus.ATIVO,
      id: args.actorUserId
        ? {
            not: args.actorUserId,
          }
        : undefined,
    },
    select: {
      id: true,
    },
  });

  if (!admins.length) {
    return;
  }

  try {
    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        title: "Nova solicitacao recebida",
        message: `${args.solicitanteNome} enviou o lote ${args.loteProtocolo} pela ${args.secretariaNome} com ${args.totalItens} ${args.totalItens === 1 ? "item" : "itens"} para conferencia.`,
        type: "REMANEJAMENTO_CREATED",
        relatedEntity: "LoteRemanejamento",
        relatedEntityId: args.loteProtocolo,
      })),
    });
  } catch (error) {
    if (isNotificationTableMissingError(error)) {
      return;
    }

    throw error;
  }
}

export async function notifyRequesterAboutExecutedBatch(args: {
  userId: string;
  loteProtocolo: string;
  secretariaNome: string;
  totalItens: number;
  executorName: string;
}) {
  await createNotification({
    userId: args.userId,
    title: "Solicitacao confirmada",
    message: `${args.executorName} confirmou o lote ${args.loteProtocolo} da ${args.secretariaNome}. ${args.totalItens} ${args.totalItens === 1 ? "item foi executado" : "itens foram executados"} no sistema.`,
    type: "REMANEJAMENTO_EXECUTED",
    relatedEntity: "LoteRemanejamento",
    relatedEntityId: args.loteProtocolo,
  });
}

export async function listNotificationsForUser(userId: string, limit = 40): Promise<NotificationListItem[]> {
  try {
    return await prisma.notification.findMany({
      where: { userId },
      orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
      take: limit,
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        isRead: true,
        createdAt: true,
        relatedEntity: true,
        relatedEntityId: true,
      },
    });
  } catch (error) {
    if (isNotificationTableMissingError(error)) {
      return [];
    }

    throw error;
  }
}

export async function getNotificationSummaryForUser(userId: string, limit = 5) {
  try {
    const [notifications, unreadCount] = await Promise.all([
      listNotificationsForUser(userId, limit),
      prisma.notification.count({
        where: {
          userId,
          isRead: false,
        },
      }),
    ]);

    return {
      notifications,
      unreadCount,
    };
  } catch (error) {
    if (isNotificationTableMissingError(error)) {
      return {
        notifications: [],
        unreadCount: 0,
      };
    }

    throw error;
  }
}

export async function markNotificationAsRead(userId: string, notificationId: string) {
  try {
    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  } catch (error) {
    if (isNotificationTableMissingError(error)) {
      return;
    }

    throw error;
  }
}

export async function markAllNotificationsAsRead(userId: string) {
  try {
    await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
  } catch (error) {
    if (isNotificationTableMissingError(error)) {
      return;
    }

    throw error;
  }
}

export function getNotificationHref(notification: Pick<NotificationListItem, "relatedEntity" | "relatedEntityId">) {
  if (notification.relatedEntity === "LoteRemanejamento" && notification.relatedEntityId) {
    return `/dashboard/remanejamentos?q=${encodeURIComponent(notification.relatedEntityId)}`;
  }

  return "/dashboard/notificacoes";
}

import { NextRequest, NextResponse } from "next/server";

import { createRequestId, logInfo, logWarn, reportServerError } from "@/lib/observability";
import { getCurrentAuthenticatedUser } from "@/services/authorization.service";
import {
  getNotificationHref,
  getNotificationSummaryForUser,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/services/notification.service";

export const dynamic = "force-dynamic";

function parseLimit(value: string | null) {
  const parsed = Number.parseInt(value ?? "8", 10);

  if (!Number.isFinite(parsed)) {
    return 8;
  }

  return Math.min(Math.max(parsed, 1), 12);
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = createRequestId(request.headers.get("x-vercel-id"));

  try {
    const user = await getCurrentAuthenticatedUser();

    if (!user) {
      logWarn("api.notifications.get.denied", {
        requestId,
        route: "/api/notifications",
      });
      return NextResponse.json({ error: "Acesso negado." }, { status: 401 });
    }

    const limit = parseLimit(new URL(request.url).searchParams.get("limit"));
    logInfo("api.notifications.get.start", {
      requestId,
      route: "/api/notifications",
      userId: user.id,
      limit,
    });

    const summary = await getNotificationSummaryForUser(user.id, limit);

    logInfo("api.notifications.get.done", {
      requestId,
      route: "/api/notifications",
      userId: user.id,
      unreadCount: summary.unreadCount,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      unreadCount: summary.unreadCount,
      notifications: summary.notifications.map((notification) => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        isRead: notification.isRead,
        createdAt: notification.createdAt.toISOString(),
        relatedEntity: notification.relatedEntity,
        relatedEntityId: notification.relatedEntityId,
        href: getNotificationHref(notification),
      })),
    });
  } catch (error) {
    reportServerError("api.notifications.get.failed", error, {
      requestId,
      route: "/api/notifications",
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({ error: "Nao foi possivel carregar as notificacoes." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = createRequestId(request.headers.get("x-vercel-id"));

  try {
    const user = await getCurrentAuthenticatedUser();

    if (!user) {
      logWarn("api.notifications.post.denied", {
        requestId,
        route: "/api/notifications",
      });
      return NextResponse.json({ error: "Acesso negado." }, { status: 401 });
    }

    const body = (await request.json().catch(() => null)) as
      | { action?: "markRead" | "markAllRead"; notificationId?: string }
      | null;

    logInfo("api.notifications.post.start", {
      requestId,
      route: "/api/notifications",
      userId: user.id,
      action: body?.action ?? "invalid",
    });

    if (body?.action === "markRead") {
      const notificationId = String(body.notificationId ?? "").trim();

      if (!notificationId) {
        return NextResponse.json({ error: "Informe a notificacao." }, { status: 400 });
      }

      await markNotificationAsRead(user.id, notificationId);
    } else if (body?.action === "markAllRead") {
      await markAllNotificationsAsRead(user.id);
    } else {
      return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
    }

    const summary = await getNotificationSummaryForUser(user.id, 8);

    logInfo("api.notifications.post.done", {
      requestId,
      route: "/api/notifications",
      userId: user.id,
      unreadCount: summary.unreadCount,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      unreadCount: summary.unreadCount,
      notifications: summary.notifications.map((notification) => ({
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        isRead: notification.isRead,
        createdAt: notification.createdAt.toISOString(),
        relatedEntity: notification.relatedEntity,
        relatedEntityId: notification.relatedEntityId,
        href: getNotificationHref(notification),
      })),
    });
  } catch (error) {
    reportServerError("api.notifications.post.failed", error, {
      requestId,
      route: "/api/notifications",
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({ error: "Nao foi possivel atualizar as notificacoes." }, { status: 500 });
  }
}

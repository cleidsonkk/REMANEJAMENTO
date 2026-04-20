import { NextRequest, NextResponse } from "next/server";

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
  const user = await getCurrentAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 401 });
  }

  const limit = parseLimit(new URL(request.url).searchParams.get("limit"));
  const summary = await getNotificationSummaryForUser(user.id, limit);

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
}

export async function POST(request: NextRequest) {
  const user = await getCurrentAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { action?: "markRead" | "markAllRead"; notificationId?: string }
    | null;

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
}

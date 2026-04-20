import { AppShell } from "@/components/layout/app-shell";
import { LiveNotificationCenter } from "@/components/notifications/live-notification-center";
import { requireSession } from "@/services/authorization.service";
import { getNotificationHref, getNotificationSummaryForUser } from "@/services/notification.service";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const notificationSummary = await getNotificationSummaryForUser(session.user.id, 8);
  const initialLiveNotifications = notificationSummary.notifications.map((notification) => ({
    id: notification.id,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    isRead: notification.isRead,
    createdAt: notification.createdAt.toISOString(),
    href: getNotificationHref(notification),
  }));

  return (
    <AppShell
      notifications={notificationSummary.notifications}
      role={session.user.role}
      unreadNotifications={notificationSummary.unreadCount}
      userName={session.user.name ?? "Usuario"}
    >
      <LiveNotificationCenter
        initialNotifications={initialLiveNotifications}
        initialUnreadCount={notificationSummary.unreadCount}
      />
      {children}
    </AppShell>
  );
}

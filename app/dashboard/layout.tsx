import { AppShell } from "@/components/layout/app-shell";
import { requireSession } from "@/services/authorization.service";
import { getNotificationSummaryForUser } from "@/services/notification.service";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  const notificationSummary = await getNotificationSummaryForUser(session.user.id);

  return (
    <AppShell
      notifications={notificationSummary.notifications}
      role={session.user.role}
      unreadNotifications={notificationSummary.unreadCount}
      userName={session.user.name ?? "Usuario"}
    >
      {children}
    </AppShell>
  );
}

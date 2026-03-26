import { AppShell } from "@/components/layout/app-shell";
import { auth } from "@/lib/auth";
import { requireSession } from "@/services/authorization.service";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  const session = await auth();

  return (
    <AppShell role={session!.user.role} userName={session!.user.name ?? "Usuario"}>
      {children}
    </AppShell>
  );
}

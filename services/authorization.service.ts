import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { hasRequiredRole } from "@/lib/access-control";

export async function requireSession() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return session;
}

export async function requireRole(role: UserRole) {
  const session = await requireSession();
  if (!hasRequiredRole(session.user.role, role)) {
    redirect("/dashboard");
  }

  return session;
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { markAllNotificationsAsRead, markNotificationAsRead } from "@/services/notification.service";

async function requireAuthenticatedUser() {
  const session = await auth();

  if (!session?.user?.id) {
    throw new Error("Acesso negado.");
  }

  return session.user;
}

function revalidateNotificationSurfaces() {
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/notificacoes");
}

export async function markNotificationAsReadAction(notificationId: string, returnPath = "/dashboard/notificacoes") {
  const user = await requireAuthenticatedUser();
  await markNotificationAsRead(user.id, notificationId);
  revalidateNotificationSurfaces();
  redirect(returnPath);
}

export async function markAllNotificationsAsReadAction(returnPath = "/dashboard/notificacoes") {
  const user = await requireAuthenticatedUser();
  await markAllNotificationsAsRead(user.id);
  revalidateNotificationSurfaces();
  redirect(returnPath);
}

"use server";

import { AuthError } from "next-auth";

import { auth, signIn, signOut } from "@/lib/auth";
import { createAuditLog } from "@/services/audit.service";

export async function loginAction(formData: FormData) {
  return loginActionState({ error: "" }, formData);
}

export async function loginActionState(_: { error: string }, formData: FormData) {
  try {
    await signIn("credentials", {
      cpf: formData.get("cpf"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "CPF ou senha inválidos." };
    }

    throw error;
  }
}

export async function logoutAction() {
  const session = await auth();
  if (session?.user?.id) {
    await createAuditLog({
      userId: session.user.id,
      action: "LOGOUT",
      entity: "Auth",
      entityId: session.user.id,
      newData: {
        userName: session.user.name,
        role: session.user.role,
      },
    });
  }

  await signOut({
    redirectTo: "/login",
  });
}

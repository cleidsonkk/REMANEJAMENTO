import { type UserRole, UserStatus } from "@prisma/client";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasRequiredRole } from "@/lib/access-control";

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  secretariaId: string | null;
  secretariaIds: string[];
  status: UserStatus;
};

type AuthenticatedSession = {
  user: AuthenticatedUser;
};

function buildAuthenticatedUser(user: {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  secretariaId: string | null;
  status: UserStatus;
  secretariasVinculadas: Array<{ secretariaId: string }>;
}) {
  return {
    id: user.id,
    name: user.nome,
    email: user.email,
    role: user.role,
    secretariaId: user.secretariaId,
    secretariaIds: user.secretariasVinculadas.map((item) => item.secretariaId),
    status: user.status,
  } satisfies AuthenticatedUser;
}

export async function getCurrentAuthenticatedUser() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      secretariasVinculadas: {
        select: {
          secretariaId: true,
        },
      },
    },
  });

  if (!user || user.status !== UserStatus.ATIVO) {
    return null;
  }

  return buildAuthenticatedUser(user);
}

export async function requireSession(): Promise<AuthenticatedSession> {
  const user = await getCurrentAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  return { user };
}

export async function requireRole(role: UserRole): Promise<AuthenticatedSession> {
  const session = await requireSession();

  if (!hasRequiredRole(session.user.role, role)) {
    redirect("/dashboard");
  }

  return session;
}

import { prisma } from "@/lib/prisma";

export async function logLoginSuccess(args: { userId: string; cpf: string }) {
  await prisma.auditLog.create({
    data: {
      userId: args.userId,
      action: "LOGIN_SUCCESS",
      entity: "Auth",
      newData: {
        cpf: args.cpf,
      },
    },
  });
}

export async function logLoginFailure(args: { cpf: string; reason: string }) {
  await prisma.auditLog.create({
    data: {
      action: "LOGIN_FAILURE",
      entity: "Auth",
      newData: {
        cpf: args.cpf,
        reason: args.reason,
      },
    },
  });
}

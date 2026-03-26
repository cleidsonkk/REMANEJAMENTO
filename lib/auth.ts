import { compare } from "bcryptjs";
import Credentials from "next-auth/providers/credentials";
import NextAuth from "next-auth";

import { authConfig } from "@/lib/auth.config";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validations/auth";
import { logLoginFailure, logLoginSuccess } from "@/services/auth-audit.service";

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        cpf: {},
        password: {},
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          await logLoginFailure({
            cpf: String(credentials?.cpf ?? ""),
            reason: "INVALID_PAYLOAD",
          });
          return null;
        }

        const cpf = parsed.data.cpf.replace(/\D/g, "");
        const user = await prisma.user.findUnique({
          where: { cpf },
          include: {
            secretariasVinculadas: {
              select: {
                secretariaId: true,
              },
            },
          },
        });

        if (!user || user.status !== "ATIVO") {
          await logLoginFailure({
            cpf,
            reason: !user ? "USER_NOT_FOUND" : "USER_INACTIVE",
          });
          return null;
        }

        const isValid = await compare(parsed.data.password, user.senhaHash);
        if (!isValid) {
          await logLoginFailure({
            cpf,
            reason: "INVALID_PASSWORD",
          });
          return null;
        }

        await logLoginSuccess({
          userId: user.id,
          cpf,
        });

        return {
          id: user.id,
          name: user.nome,
          email: user.email,
          role: user.role,
          secretariaId: user.secretariaId,
          secretariaIds: user.secretariasVinculadas.map((item) => item.secretariaId),
          status: user.status,
        };
      },
    }),
  ],
});

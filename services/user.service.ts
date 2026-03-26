import { prisma } from "@/lib/prisma";

export async function listUsers(search?: string) {
  return prisma.user.findMany({
    where: search
      ? {
          OR: [
            { nome: { contains: search, mode: "insensitive" } },
            { cpf: { contains: search.replace(/\D/g, "") } },
            { email: { contains: search, mode: "insensitive" } },
            { secretaria: { nomeSecretaria: { contains: search, mode: "insensitive" } } },
            {
              secretariasVinculadas: {
                some: {
                  secretaria: {
                    nomeSecretaria: { contains: search, mode: "insensitive" },
                  },
                },
              },
            },
          ],
        }
      : undefined,
    include: {
      secretaria: true,
      secretariasVinculadas: {
        include: {
          secretaria: true,
        },
        orderBy: {
          secretaria: {
            codigo: "asc",
          },
        },
      },
    },
    orderBy: {
      nome: "asc",
    },
  });
}

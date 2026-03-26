import path from "node:path";

import { PrismaClient, UserRole, UserStatus } from "@prisma/client";
import { hash } from "bcryptjs";
import * as XLSX from "xlsx";

import { parseSecretariasFromSheetRows, type SheetRow } from "@/lib/secretaria-catalog";

const prisma = new PrismaClient();

process.loadEnvFile?.();

function deriveSigla(nome: string) {
  return nome
    .split(" ")
    .filter((word) => word.length > 2)
    .slice(0, 4)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

async function main() {
  const filePath = path.join(process.cwd(), "dados das secretaria.xlsx");
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<SheetRow>(sheet, { header: 1, defval: null });
  const importedSecretarias = parseSecretariasFromSheetRows(rows);

  const existingSecretarias = await prisma.secretaria.findMany({
    orderBy: { codigo: "asc" },
  });

  for (const [index, secretaria] of existingSecretarias.entries()) {
    await prisma.secretaria.update({
      where: { id: secretaria.id },
      data: {
        codigo: 1000 + index + 1,
      },
    });
  }

  const existingByUnit = new Map(existingSecretarias.map((item) => [item.unidadeOrcamentaria, item]));

  for (const [index, secretaria] of importedSecretarias.entries()) {
    const codigoSequencial = index + 1;
    const existing = existingByUnit.get(secretaria.unidadeOrcamentaria);

    const upserted = existing
      ? await prisma.secretaria.update({
          where: { id: existing.id },
          data: {
            codigo: codigoSequencial,
            nomeSecretaria: secretaria.nomeSecretaria,
            nomeSecretario: secretaria.nomeSecretario,
            unidadeOrcamentaria: secretaria.unidadeOrcamentaria,
            sigla: deriveSigla(secretaria.nomeSecretaria),
            statusAtivo: true,
          },
        })
      : await prisma.secretaria.create({
          data: {
            codigo: codigoSequencial,
            nomeSecretaria: secretaria.nomeSecretaria,
            nomeSecretario: secretaria.nomeSecretario,
            unidadeOrcamentaria: secretaria.unidadeOrcamentaria,
            sigla: deriveSigla(secretaria.nomeSecretaria),
            statusAtivo: true,
          },
        });

    await prisma.secretariaCatalogItem.deleteMany({
      where: {
        secretariaId: upserted.id,
      },
    });

    if (secretaria.catalogItems.length) {
      await prisma.secretariaCatalogItem.createMany({
        data: secretaria.catalogItems.map((item) => ({
          secretariaId: upserted.id,
          acao: item.acao,
          fonte: item.fonte,
          elemento: item.elemento,
          funcao: item.funcao,
          subFuncao: item.subFuncao,
          programa: item.programa,
        })),
      });
    }
  }

  const importedUnits = new Set(importedSecretarias.map((item) => item.unidadeOrcamentaria));
  const remainingSecretarias = await prisma.secretaria.findMany({
    where: {
      unidadeOrcamentaria: {
        notIn: Array.from(importedUnits),
      },
    },
    orderBy: { createdAt: "asc" },
  });

  let nextCodigo = importedSecretarias.length + 1;
  for (const secretaria of remainingSecretarias) {
    await prisma.secretaria.update({
      where: { id: secretaria.id },
      data: {
        codigo: nextCodigo++,
      },
    });
  }

  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "SenhaForte123!";
  const passwordHash = await hash(adminPassword, 10);
  const adminCpf = (process.env.SEED_ADMIN_CPF ?? "00000000000").replace(/\D/g, "");
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@umbauuba.se.gov.br").toLowerCase();
  const secretariaPlanejamento = await prisma.secretaria.findFirst({
    where: {
      OR: [
        { unidadeOrcamentaria: "02008" },
        {
          nomeSecretaria: {
            contains: "PLANEJAMENTO",
            mode: "insensitive",
          },
        },
      ],
    },
  });

  const admin = await prisma.user.upsert({
    where: {
      cpf: adminCpf,
    },
    update: {
      nome: process.env.SEED_ADMIN_NAME ?? "Administrador Planejamento",
      cpf: adminCpf,
      email: adminEmail,
      senhaHash: passwordHash,
      role: UserRole.ADMIN_PLANEJAMENTO,
      secretariaId: secretariaPlanejamento?.id ?? null,
      status: UserStatus.ATIVO,
    },
    create: {
      nome: process.env.SEED_ADMIN_NAME ?? "Administrador Planejamento",
      cpf: adminCpf,
      email: adminEmail,
      senhaHash: passwordHash,
      role: UserRole.ADMIN_PLANEJAMENTO,
      secretariaId: secretariaPlanejamento?.id ?? null,
      status: UserStatus.ATIVO,
    },
  });

  if (secretariaPlanejamento) {
    await prisma.userSecretaria.upsert({
      where: {
        userId_secretariaId: {
          userId: admin.id,
          secretariaId: secretariaPlanejamento.id,
        },
      },
      update: {},
      create: {
        userId: admin.id,
        secretariaId: secretariaPlanejamento.id,
      },
    });
  }

  console.log(`Seed finalizado com ${importedSecretarias.length} secretarias importadas.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

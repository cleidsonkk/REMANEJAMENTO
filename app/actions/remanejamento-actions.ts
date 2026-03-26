"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildProtocol } from "@/lib/utils";
import { remanejamentoSchema } from "@/lib/validations/remanejamento";
import { createAuditLog } from "@/services/audit.service";
import { markAsExecuted } from "@/services/remanejamento.service";

export async function createRemanejamentoAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Acesso negado.");
  }

  const entriesJson = String(formData.get("entriesJson") ?? "[]");

  let rawEntries: unknown;
  try {
    rawEntries = JSON.parse(entriesJson);
  } catch {
    return { error: "Não foi possível interpretar o lote informado." };
  }

  const parsed = remanejamentoSchema.safeParse({
    secretariaId: formData.get("secretariaId"),
    justificativa: formData.get("justificativa"),
    entries: rawEntries,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      secretariasVinculadas: {
        include: {
          secretaria: true,
        },
      },
    },
  });

  if (!user) {
    return { error: "Usuário não encontrado." };
  }

  const vinculoSelecionado = user.secretariasVinculadas.find((item) => item.secretariaId === parsed.data.secretariaId);

  if (!vinculoSelecionado?.secretaria || !vinculoSelecionado.secretaria.statusAtivo) {
    return { error: "A secretaria escolhida não está autorizada para este usuário." };
  }

  const secretaria = vinculoSelecionado.secretaria;
  const loteProtocolo = buildProtocol();

  const created = await prisma.$transaction(async (tx) => {
    const createdItems = [];

    for (const [index, entry] of parsed.data.entries.entries()) {
      const protocolo =
        parsed.data.entries.length === 1 ? loteProtocolo : `${loteProtocolo}-${String(index + 1).padStart(2, "0")}`;

      const remanejamento = await tx.remanejamento.create({
        data: {
          protocolo,
          loteProtocolo,
          loteSequencia: index + 1,
          secretariaId: secretaria.id,
          solicitanteId: user.id,
          dataSolicitacao: new Date(),
          unidadeOrcamentaria: secretaria.unidadeOrcamentaria,
          nomeSecretaria: secretaria.nomeSecretaria,
          nomeSecretario: secretaria.nomeSecretario,
          nomeSolicitante: user.nome,
          cpfSolicitante: user.cpf,
          justificativa: parsed.data.justificativa,
          destinoAcao: entry.destinoAcao,
          destinoFonte: entry.destinoFonte,
          destinoElemento: entry.destinoElemento,
          destinoValor: entry.destinoValor,
          origemAcao: entry.origemAcao,
          origemFonte: entry.origemFonte,
          origemElemento: entry.origemElemento,
          origemValor: entry.origemValor,
        },
      });

      createdItems.push(remanejamento);
    }

    return createdItems;
  });

  for (const item of created) {
    await createAuditLog({
      userId: user.id,
      action: "CREATE",
      entity: "Remanejamento",
      entityId: item.id,
      newData: item,
    });
  }

  await createAuditLog({
    userId: user.id,
    action: "CREATE_BATCH",
    entity: "LoteRemanejamento",
    entityId: loteProtocolo,
    newData: {
      loteProtocolo,
      totalItens: created.length,
      secretariaId: secretaria.id,
      secretariaNome: secretaria.nomeSecretaria,
      unidadeOrcamentaria: secretaria.unidadeOrcamentaria,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/remanejamentos");
  return { success: true, protocolo: loteProtocolo, totalItens: created.length };
}

export async function executeRemanejamentoAction(id: string) {
  const session = await auth();
  if (session?.user.role !== "ADMIN_PLANEJAMENTO") {
    throw new Error("Acesso negado.");
  }

  const updated = await markAsExecuted(id);

  for (const item of updated.itens) {
    await createAuditLog({
      userId: session.user.id,
      action: "EXECUTE",
      entity: "Remanejamento",
      entityId: item.id,
      newData: item,
    });
  }

  await createAuditLog({
    userId: session.user.id,
    action: "EXECUTE_BATCH",
    entity: "LoteRemanejamento",
    entityId: updated.loteProtocolo,
    newData: {
      loteProtocolo: updated.loteProtocolo,
      totalItens: updated.itens.length,
      secretariaId: updated.itens[0]?.secretariaId ?? null,
      secretariaNome: updated.itens[0]?.nomeSecretaria ?? null,
      unidadeOrcamentaria: updated.itens[0]?.unidadeOrcamentaria ?? null,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/remanejamentos");
  revalidatePath("/dashboard/executados");
}

export async function executeRemanejamentoAndRedirectAction(id: string, returnPath: string) {
  await executeRemanejamentoAction(id);
  redirect(returnPath);
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { buildProtocol } from "@/lib/utils";
import { remanejamentoSchema } from "@/lib/validations/remanejamento";
import { createAuditLog } from "@/services/audit.service";
import { getCurrentAuthenticatedUser } from "@/services/authorization.service";
import {
  notifyAdminsAboutCreatedBatch,
  notifyRequesterAboutAdministrativeReview,
  notifyRequesterAboutExecutedBatch,
} from "@/services/notification.service";
import { markAsCancelled, markAsExecuted, markAsReturnedForCorrection } from "@/services/remanejamento.service";

function revalidateRemanejamentoPaths() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/notificacoes");
  revalidatePath("/dashboard/remanejamentos");
}

function getAdministrativeReason(formData: FormData) {
  const reason = String(formData.get("reason") ?? "").trim();

  if (reason.length < 10) {
    throw new Error("Informe um motivo com pelo menos 10 caracteres.");
  }

  return reason;
}

function getCorrectionSourceContext(formData: FormData) {
  const sourceId = String(formData.get("correctionSourceId") ?? "").trim();
  const sourceLoteProtocolo = String(formData.get("correctionSourceLoteProtocolo") ?? "").trim();

  if (!sourceId || !sourceLoteProtocolo) {
    return null;
  }

  return {
    sourceId,
    sourceLoteProtocolo,
  };
}

export async function createRemanejamentoAction(formData: FormData) {
  const currentUser = await getCurrentAuthenticatedUser();
  if (!currentUser) {
    throw new Error("Acesso negado.");
  }

  const entriesJson = String(formData.get("entriesJson") ?? "[]");

  let rawEntries: unknown;
  try {
    rawEntries = JSON.parse(entriesJson);
  } catch {
    return { error: "NÃ£o foi possÃ­vel interpretar o lote informado." };
  }

  const parsed = remanejamentoSchema.safeParse({
    secretariaId: formData.get("secretariaId"),
    justificativa: formData.get("justificativa"),
    entries: rawEntries,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados invÃ¡lidos." };
  }

  const user = await prisma.user.findUnique({
    where: { id: currentUser.id },
    include: {
      secretariasVinculadas: {
        include: {
          secretaria: true,
        },
      },
    },
  });

  if (!user) {
    return { error: "UsuÃ¡rio nÃ£o encontrado." };
  }

  const vinculoSelecionado = user.secretariasVinculadas.find((item) => item.secretariaId === parsed.data.secretariaId);

  if (!vinculoSelecionado?.secretaria || !vinculoSelecionado.secretaria.statusAtivo) {
    return { error: "A secretaria escolhida nÃ£o estÃ¡ autorizada para este usuÃ¡rio." };
  }

  const secretaria = vinculoSelecionado.secretaria;
  const loteProtocolo = buildProtocol();
  const correctionSource = getCorrectionSourceContext(formData);

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
      correctionSourceId: correctionSource?.sourceId ?? null,
      correctionSourceLoteProtocolo: correctionSource?.sourceLoteProtocolo ?? null,
    },
  });

  if (correctionSource) {
    await createAuditLog({
      userId: user.id,
      action: "RESUBMIT_FOR_CORRECTION",
      entity: "LoteRemanejamento",
      entityId: correctionSource.sourceLoteProtocolo,
      newData: {
        sourceLoteProtocolo: correctionSource.sourceLoteProtocolo,
        novoLoteProtocolo: loteProtocolo,
        totalItens: created.length,
      },
    });
  }

  await notifyAdminsAboutCreatedBatch({
    loteProtocolo,
    secretariaNome: secretaria.nomeSecretaria,
    solicitanteNome: user.nome,
    totalItens: created.length,
    actorUserId: user.id,
  });

  revalidateRemanejamentoPaths();
  return { success: true, protocolo: loteProtocolo, totalItens: created.length };
}

export async function executeRemanejamentoAction(id: string) {
  const currentUser = await getCurrentAuthenticatedUser();
  if (currentUser?.role !== "ADMIN_PLANEJAMENTO") {
    throw new Error("Acesso negado.");
  }

  const updated = await markAsExecuted(id);

  for (const item of updated.itens) {
    await createAuditLog({
      userId: currentUser.id,
      action: "EXECUTE",
      entity: "Remanejamento",
      entityId: item.id,
      newData: item,
    });
  }

  await createAuditLog({
    userId: currentUser.id,
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

  if (updated.itens[0]?.solicitanteId) {
    await notifyRequesterAboutExecutedBatch({
      userId: updated.itens[0].solicitanteId,
      loteProtocolo: updated.loteProtocolo,
      secretariaNome: updated.itens[0]?.nomeSecretaria ?? "secretaria informada",
      totalItens: updated.itens.length,
      executorName: currentUser.name ?? "Administrador",
    });
  }

  revalidateRemanejamentoPaths();
  revalidatePath("/dashboard/executados");
}

async function resolvePendingBatchForAdmin(args: {
  id: string;
  formData: FormData;
  auditAction: "RETURN_BATCH" | "CANCEL_BATCH";
  mode: "RETURN_FOR_CORRECTION" | "CANCEL";
  transition: "RETURN" | "CANCEL";
}) {
  const currentUser = await getCurrentAuthenticatedUser();
  if (currentUser?.role !== "ADMIN_PLANEJAMENTO") {
    throw new Error("Acesso negado.");
  }

  const reason = getAdministrativeReason(args.formData);
  const updated = args.transition === "RETURN" ? await markAsReturnedForCorrection(args.id) : await markAsCancelled(args.id);

  for (const item of updated.itens) {
    await createAuditLog({
      userId: currentUser.id,
      action: "UPDATE",
      entity: "Remanejamento",
      entityId: item.id,
      newData: {
        status: item.status,
        dataConclusao: item.dataConclusao,
        reason,
        administrativeMode: args.mode,
      },
    });
  }

  await createAuditLog({
    userId: currentUser.id,
    action: args.auditAction,
    entity: "LoteRemanejamento",
    entityId: updated.loteProtocolo,
    newData: {
      loteProtocolo: updated.loteProtocolo,
      totalItens: updated.itens.length,
      secretariaId: updated.itens[0]?.secretariaId ?? null,
      secretariaNome: updated.itens[0]?.nomeSecretaria ?? null,
      unidadeOrcamentaria: updated.itens[0]?.unidadeOrcamentaria ?? null,
      reason,
      administrativeMode: args.mode,
    },
  });

  if (updated.itens[0]?.solicitanteId) {
    await notifyRequesterAboutAdministrativeReview({
      userId: updated.itens[0].solicitanteId,
      loteProtocolo: updated.loteProtocolo,
      secretariaNome: updated.itens[0]?.nomeSecretaria ?? "secretaria informada",
      totalItens: updated.itens.length,
      adminName: currentUser.name ?? "Administrador",
      reason,
      mode: args.mode,
    });
  }

  revalidateRemanejamentoPaths();
}

export async function requestRemanejamentoCorrectionAction(id: string, formData: FormData) {
  await resolvePendingBatchForAdmin({
    id,
    formData,
    auditAction: "RETURN_BATCH",
    mode: "RETURN_FOR_CORRECTION",
    transition: "RETURN",
  });
}

export async function cancelRemanejamentoAction(id: string, formData: FormData) {
  await resolvePendingBatchForAdmin({
    id,
    formData,
    auditAction: "CANCEL_BATCH",
    mode: "CANCEL",
    transition: "CANCEL",
  });
}

export async function executeRemanejamentoAndRedirectAction(id: string, returnPath: string) {
  await executeRemanejamentoAction(id);
  redirect(returnPath);
}

export async function requestRemanejamentoCorrectionAndRedirectAction(id: string, returnPath: string, formData: FormData) {
  await requestRemanejamentoCorrectionAction(id, formData);
  redirect(returnPath);
}

export async function cancelRemanejamentoAndRedirectAction(id: string, returnPath: string, formData: FormData) {
  await cancelRemanejamentoAction(id, formData);
  redirect(returnPath);
}

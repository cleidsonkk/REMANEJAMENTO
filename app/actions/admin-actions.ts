"use server";

import { Prisma, UserRole, UserStatus } from "@prisma/client";
import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPasswordPolicyMessage } from "@/lib/utils";
import { secretariaSchema } from "@/lib/validations/secretaria";
import { passwordSchema, userSchema, userUpdateSchema } from "@/lib/validations/user";
import { createAuditLog } from "@/services/audit.service";

function redirectAdminUsuarios(params: Record<string, string>) {
  const search = new URLSearchParams(params);
  redirect(`/dashboard/admin/usuarios?${search.toString()}`);
}

function redirectAdminSecretarias(params: Record<string, string>) {
  const search = new URLSearchParams(params);
  redirect(`/dashboard/admin/secretarias?${search.toString()}`);
}

function getPrismaDuplicateMessage(error: unknown, fallback: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const target = Array.isArray(error.meta?.target)
      ? error.meta?.target.map((item) => String(item))
      : typeof error.meta?.target === "string"
        ? [error.meta.target]
        : [];

    if (target.includes("cpf")) {
      return "J\u00e1 existe um usu\u00e1rio cadastrado com este CPF.";
    }

    if (target.includes("email")) {
      return "J\u00e1 existe um usu\u00e1rio cadastrado com este e-mail.";
    }

    if (target.includes("unidadeOrcamentaria")) {
      return "J\u00e1 existe uma secretaria com esta unidade or\u00e7ament\u00e1ria.";
    }

    return fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Não foi possível concluir a operação.";
}

function normalizeSecretariaIds(values: FormDataEntryValue[]) {
  return Array.from(
    new Set(
      values
        .map((value) => String(value ?? "").trim())
        .filter(Boolean),
    ),
  );
}

async function requirePlanningAdmin() {
  const session = await auth();
  if (session?.user.role !== "ADMIN_PLANEJAMENTO") {
    throw new Error("Acesso negado.");
  }

  return session;
}

async function ensureSecretariasCanReceiveUsers(secretariaIds: string[]) {
  if (!secretariaIds.length) {
    return [];
  }

  const secretarias = await prisma.secretaria.findMany({
    where: {
      id: {
        in: secretariaIds,
      },
    },
  });

  if (secretarias.length !== secretariaIds.length) {
    throw new Error("Uma ou mais secretarias informadas não foram encontradas.");
  }

  const inactive = secretarias.find((item) => !item.statusAtivo);
  if (inactive) {
    throw new Error("Secretaria inativa não pode receber novos usuários.");
  }

  return secretarias;
}

async function ensureLastAdminWillRemain(targetUserId: string) {
  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!target || target.role !== UserRole.ADMIN_PLANEJAMENTO || target.status !== UserStatus.ATIVO) {
    return;
  }

  const activeAdmins = await prisma.user.count({
    where: {
      role: UserRole.ADMIN_PLANEJAMENTO,
      status: UserStatus.ATIVO,
    },
  });

  if (activeAdmins <= 1) {
    throw new Error("O sistema precisa manter pelo menos um administrador ativo.");
  }
}

async function syncUserSecretariaLinks(tx: Prisma.TransactionClient, userId: string, secretariaIds: string[]) {
  await tx.userSecretaria.deleteMany({
    where: { userId },
  });

  if (!secretariaIds.length) {
    return;
  }

  await tx.userSecretaria.createMany({
    data: secretariaIds.map((secretariaId) => ({
      userId,
      secretariaId,
    })),
  });
}

function sanitizeUserForAudit(user: {
  id: string;
  nome: string;
  cpf: string;
  email: string;
  telefone: string | null;
  role: UserRole;
  secretariaId: string | null;
  status: UserStatus;
}) {
  return {
    ...user,
    senhaHash: "[PROTECTED]",
  };
}

export async function createSecretariaAction(formData: FormData) {
  try {
    const session = await requirePlanningAdmin();
    const parsed = secretariaSchema.safeParse({
      nomeSecretaria: formData.get("nomeSecretaria"),
      sigla: formData.get("sigla"),
      codigo: formData.get("codigo"),
      unidadeOrcamentaria: formData.get("unidadeOrcamentaria"),
      nomeSecretario: formData.get("nomeSecretario"),
      statusAtivo: formData.get("statusAtivo") === "on",
    });

    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
    }

    const aggregate = await prisma.secretaria.aggregate({
      _max: {
        codigo: true,
      },
    });

    const nextCodigo = (aggregate._max.codigo ?? 0) + 1;

    const secretaria = await prisma.secretaria.create({
      data: {
        ...parsed.data,
        codigo: nextCodigo,
        unidadeOrcamentaria: String(parsed.data.unidadeOrcamentaria || parsed.data.codigo)
          .replace(/\D/g, "")
          .padStart(5, "0"),
        sigla: parsed.data.sigla || null,
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      entity: "Secretaria",
      entityId: secretaria.id,
      newData: secretaria,
    });

    revalidatePath("/dashboard/admin/secretarias");
    redirectAdminSecretarias({ success: "Secretaria cadastrada com sucesso." });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirectAdminSecretarias({
      error: getPrismaDuplicateMessage(error, "Já existe uma secretaria com esta unidade orçamentária."),
    });
  }
}

export async function updateSecretariaAction(secretariaId: string, formData: FormData) {
  try {
    const session = await requirePlanningAdmin();
    const parsed = secretariaSchema.safeParse({
      nomeSecretaria: formData.get("nomeSecretaria"),
      sigla: formData.get("sigla"),
      codigo: formData.get("codigo"),
      unidadeOrcamentaria: formData.get("unidadeOrcamentaria"),
      nomeSecretario: formData.get("nomeSecretario"),
      statusAtivo: formData.get("statusAtivo") === "on",
    });

    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
    }

    const current = await prisma.secretaria.findUnique({
      where: { id: secretariaId },
    });

    if (!current) {
      throw new Error("Secretaria não encontrada.");
    }

    const secretaria = await prisma.secretaria.update({
      where: { id: secretariaId },
      data: {
        nomeSecretaria: parsed.data.nomeSecretaria,
        sigla: parsed.data.sigla || null,
        unidadeOrcamentaria: String(parsed.data.unidadeOrcamentaria).replace(/\D/g, "").padStart(5, "0"),
        nomeSecretario: parsed.data.nomeSecretario,
        statusAtivo: parsed.data.statusAtivo,
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entity: "Secretaria",
      entityId: secretaria.id,
      oldData: current,
      newData: secretaria,
    });

    revalidatePath("/dashboard/admin/secretarias");
    redirectAdminSecretarias({ success: "Secretaria atualizada com sucesso.", edit: secretariaId });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirectAdminSecretarias({
      error: getPrismaDuplicateMessage(error, "Não foi possível atualizar a secretaria."),
      edit: secretariaId,
    });
  }
}

export async function toggleSecretariaStatusAction(secretariaId: string) {
  try {
    const session = await requirePlanningAdmin();
    const current = await prisma.secretaria.findUnique({
      where: { id: secretariaId },
    });

    if (!current) {
      throw new Error("Secretaria não encontrada.");
    }

    const updated = await prisma.secretaria.update({
      where: { id: secretariaId },
      data: {
        statusAtivo: !current.statusAtivo,
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entity: "Secretaria",
      entityId: updated.id,
      oldData: current,
      newData: updated,
    });

    revalidatePath("/dashboard/admin/secretarias");
    redirectAdminSecretarias({
      success: updated.statusAtivo ? "Secretaria reativada com sucesso." : "Secretaria inativada com sucesso.",
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirectAdminSecretarias({
      error: error instanceof Error ? error.message : "Não foi possível alterar o status da secretaria.",
    });
  }
}

export async function createUserAction(formData: FormData) {
  try {
    const session = await requirePlanningAdmin();
    const defaultSecretariaIdRaw = String(formData.get("secretariaId") ?? "").trim();
    const secretariaIds = normalizeSecretariaIds([
      ...formData.getAll("secretariaIds"),
      ...(defaultSecretariaIdRaw ? [defaultSecretariaIdRaw] : []),
    ]);
    const secretarias = await ensureSecretariasCanReceiveUsers(secretariaIds);
    const defaultSecretariaId =
      defaultSecretariaIdRaw || (secretariaIds.length === 1 ? secretariaIds[0] : secretariaIds[0] ?? null);

    const parsed = userSchema.safeParse({
      nome: formData.get("nome"),
      cpf: formData.get("cpf"),
      email: formData.get("email"),
      telefone: formData.get("telefone"),
      password: formData.get("password"),
      role: formData.get("role"),
      secretariaId: defaultSecretariaId,
      secretariaIds,
      status: formData.get("status"),
    });

    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
    }

    const passwordHash = await hash(parsed.data.password, 10);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          nome: parsed.data.nome,
          cpf: parsed.data.cpf.replace(/\D/g, ""),
          email: parsed.data.email.toLowerCase(),
          telefone: parsed.data.telefone || null,
          senhaHash: passwordHash,
          role: parsed.data.role,
          secretariaId: parsed.data.secretariaId || null,
          status: parsed.data.status,
        },
      });

      await syncUserSecretariaLinks(tx, created.id, parsed.data.secretariaIds);

      return created;
    });

    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      entity: "User",
      entityId: user.id,
      newData: {
        ...sanitizeUserForAudit(user),
        secretariasVinculadas: secretarias.map((item) => ({
          id: item.id,
          nomeSecretaria: item.nomeSecretaria,
          unidadeOrcamentaria: item.unidadeOrcamentaria,
        })),
      },
    });

    revalidatePath("/dashboard/admin/usuarios");
    redirectAdminUsuarios({ userSuccess: "Usuário cadastrado com sucesso." });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirectAdminUsuarios({ userError: getPrismaDuplicateMessage(error, "CPF ou e-mail já cadastrado no sistema.") });
  }
}

export async function updateUserAction(userId: string, formData: FormData) {
  try {
    const session = await requirePlanningAdmin();
    const defaultSecretariaIdRaw = String(formData.get("secretariaId") ?? "").trim();
    const secretariaIds = normalizeSecretariaIds([
      ...formData.getAll("secretariaIds"),
      ...(defaultSecretariaIdRaw ? [defaultSecretariaIdRaw] : []),
    ]);
    const secretarias = await ensureSecretariasCanReceiveUsers(secretariaIds);
    const defaultSecretariaId =
      defaultSecretariaIdRaw || (secretariaIds.length === 1 ? secretariaIds[0] : secretariaIds[0] ?? null);

    const parsed = userUpdateSchema.safeParse({
      nome: formData.get("nome"),
      cpf: formData.get("cpf"),
      email: formData.get("email"),
      telefone: formData.get("telefone"),
      role: formData.get("role"),
      secretariaId: defaultSecretariaId,
      secretariaIds,
      status: formData.get("status"),
    });

    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Dados inválidos.");
    }

    if (parsed.data.status === UserStatus.INATIVO) {
      await ensureLastAdminWillRemain(userId);
    }

    const current = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        secretariasVinculadas: {
          include: {
            secretaria: true,
          },
        },
      },
    });

    if (!current) {
      throw new Error("Usuário não encontrado.");
    }

    const user = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          nome: parsed.data.nome,
          cpf: parsed.data.cpf.replace(/\D/g, ""),
          email: parsed.data.email.toLowerCase(),
          telefone: parsed.data.telefone || null,
          role: parsed.data.role,
          secretariaId: parsed.data.secretariaId || null,
          status: parsed.data.status,
        },
      });

      await syncUserSecretariaLinks(tx, userId, parsed.data.secretariaIds);

      return updated;
    });

    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entity: "User",
      entityId: user.id,
      oldData: {
        ...sanitizeUserForAudit(current),
        secretariasVinculadas: current.secretariasVinculadas.map((item) => ({
          id: item.secretaria.id,
          nomeSecretaria: item.secretaria.nomeSecretaria,
          unidadeOrcamentaria: item.secretaria.unidadeOrcamentaria,
        })),
      },
      newData: {
        ...sanitizeUserForAudit(user),
        secretariasVinculadas: secretarias.map((item) => ({
          id: item.id,
          nomeSecretaria: item.nomeSecretaria,
          unidadeOrcamentaria: item.unidadeOrcamentaria,
        })),
      },
    });

    revalidatePath("/dashboard/admin/usuarios");
    redirectAdminUsuarios({ userSuccess: "Usuário atualizado com sucesso.", edit: userId });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirectAdminUsuarios({
      userError: getPrismaDuplicateMessage(error, "Não foi possível atualizar o usuário."),
      edit: userId,
    });
  }
}

export async function toggleUserStatusAction(userId: string) {
  try {
    const session = await requirePlanningAdmin();
    const current = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        secretariasVinculadas: true,
      },
    });

    if (!current) {
      throw new Error("Usuário não encontrado.");
    }

    if (current.status === UserStatus.ATIVO) {
      await ensureLastAdminWillRemain(userId);
    } else {
      await ensureSecretariasCanReceiveUsers(current.secretariasVinculadas.map((item) => item.secretariaId));
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        status: current.status === UserStatus.ATIVO ? UserStatus.INATIVO : UserStatus.ATIVO,
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entity: "User",
      entityId: updated.id,
      oldData: sanitizeUserForAudit(current),
      newData: sanitizeUserForAudit(updated),
    });

    revalidatePath("/dashboard/admin/usuarios");
    redirectAdminUsuarios({
      userSuccess: updated.status === UserStatus.ATIVO ? "Usuário reativado com sucesso." : "Usuário inativado com sucesso.",
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirectAdminUsuarios({
      userError: error instanceof Error ? error.message : "Não foi possível alterar o status do usuário.",
    });
  }
}

export async function resetUserPasswordAction(formData: FormData) {
  try {
    const session = await requirePlanningAdmin();
    const userId = String(formData.get("userId") ?? "").trim();
    const password = String(formData.get("password") ?? "").trim();

    if (!userId) {
      throw new Error("Selecione um usuário para redefinir a senha.");
    }

    const passwordValidation = passwordSchema.safeParse(password);
    if (!passwordValidation.success) {
      throw new Error(passwordValidation.error.issues[0]?.message ?? getPasswordPolicyMessage());
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new Error("Usuário não encontrado.");
    }

    const senhaHash = await hash(password, 10);

    await prisma.user.update({
      where: { id: userId },
      data: {
        senhaHash,
      },
    });

    await createAuditLog({
      userId: session.user.id,
      action: "RESET_PASSWORD",
      entity: "User",
      entityId: existingUser.id,
      oldData: {
        status: existingUser.status,
      },
      newData: {
        nome: existingUser.nome,
        cpf: existingUser.cpf,
        email: existingUser.email,
        senhaHash: "[PROTECTED]",
      },
    });

    revalidatePath("/dashboard/admin/usuarios");
    revalidatePath("/dashboard/auditoria");
    redirectAdminUsuarios({ resetSuccess: "Senha redefinida com sucesso." });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    redirectAdminUsuarios({
      resetError: error instanceof Error ? error.message : "Não foi possível redefinir a senha.",
    });
  }
}

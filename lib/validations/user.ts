import { UserRole, UserStatus } from "@prisma/client";
import { z } from "zod";

import { getPasswordPolicyMessage } from "@/lib/utils";

export const passwordSchema = z
  .string()
  .min(6, getPasswordPolicyMessage())
  .regex(/[A-Z]/, getPasswordPolicyMessage())
  .regex(/[a-z]/, getPasswordPolicyMessage())
  .regex(/\d/, getPasswordPolicyMessage());

const baseUserSchema = z.object({
  nome: z.string().trim().min(3, "Informe o nome"),
  cpf: z.string().trim().min(11, "Informe o CPF"),
  email: z.string().trim().email("Informe um e-mail válido"),
  telefone: z.string().trim().optional().or(z.literal("")),
  role: z.nativeEnum(UserRole),
  secretariaId: z.string().trim().optional().nullable(),
  secretariaIds: z.array(z.string().trim()).default([]),
  status: z.nativeEnum(UserStatus).default(UserStatus.ATIVO),
});

function validateSecretariaBindings(
  data: {
    role: UserRole;
    secretariaId?: string | null;
    secretariaIds: string[];
  },
  ctx: z.RefinementCtx,
) {
  if (data.role === UserRole.USUARIO_SECRETARIA && data.secretariaIds.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["secretariaIds"],
      message: "Usuário de secretaria precisa estar vinculado a pelo menos uma secretaria.",
    });
  }

  if (data.secretariaId && !data.secretariaIds.includes(data.secretariaId)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["secretariaId"],
      message: "A secretaria padrão precisa estar entre as secretarias autorizadas.",
    });
  }
}

export const userSchema = baseUserSchema
  .extend({
    password: passwordSchema,
  })
  .superRefine(validateSecretariaBindings);

export const userUpdateSchema = baseUserSchema.superRefine(validateSecretariaBindings);

export type UserSchema = z.infer<typeof userSchema>;
export type UserUpdateSchema = z.infer<typeof userUpdateSchema>;

import { z } from "zod";

export const loginSchema = z.object({
  cpf: z.string().min(11, "Informe o CPF"),
  password: z.string().min(6, "Informe uma senha com pelo menos 6 caracteres"),
});

export type LoginSchema = z.infer<typeof loginSchema>;

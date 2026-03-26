import { z } from "zod";

export const executadosFilterSchema = z.object({
  secretaria: z.string().trim().optional().default(""),
  cpf: z.string().trim().optional().default(""),
  acao: z.string().trim().optional().default(""),
  fonte: z.string().trim().optional().default(""),
  elemento: z.string().trim().optional().default(""),
  dataInicial: z.string().trim().optional().default(""),
  dataFinal: z.string().trim().optional().default(""),
});

export type ExecutadosFilterInput = z.infer<typeof executadosFilterSchema>;

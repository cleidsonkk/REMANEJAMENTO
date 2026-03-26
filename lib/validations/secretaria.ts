import { z } from "zod";

export const secretariaSchema = z.object({
  nomeSecretaria: z.string().min(3),
  sigla: z.string().max(20).optional().or(z.literal("")),
  codigo: z.preprocess(
    (value) => {
      if (value === "" || value === null || value === undefined) {
        return undefined;
      }
      return Number(value);
    },
    z.number().int().positive().optional(),
  ),
  unidadeOrcamentaria: z.string().min(2),
  nomeSecretario: z.string().min(3),
  statusAtivo: z.boolean().default(true),
});

export type SecretariaSchema = z.infer<typeof secretariaSchema>;

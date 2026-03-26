import { z } from "zod";

import { parseBrazilianCurrencyInput } from "@/lib/utils";

const catalogField = z.string().min(1, "Campo obrigatório");
const currencyField = z
  .union([z.string(), z.number()])
  .transform((value) => parseBrazilianCurrencyInput(value))
  .refine((value) => Number.isFinite(value) && value > 0, "Informe um valor válido");

export const remanejamentoEntrySchema = z
  .object({
    destinoAcao: catalogField,
    destinoFonte: catalogField,
    destinoElemento: catalogField,
    destinoValor: currencyField,
    origemAcao: catalogField,
    origemFonte: catalogField,
    origemElemento: catalogField,
    origemValor: currencyField,
  })
  .refine((data) => data.destinoValor === data.origemValor, {
    message: "Adição e anulação precisam ter o mesmo valor",
    path: ["origemValor"],
  });

export const remanejamentoSchema = z.object({
  secretariaId: z.string().min(1, "Selecione a secretaria que está operando no momento."),
  justificativa: z.string().min(10, "Descreva a justificativa"),
  entries: z.array(remanejamentoEntrySchema).min(1, "Adicione pelo menos um item ao lote."),
});

export type RemanejamentoEntrySchema = z.infer<typeof remanejamentoEntrySchema>;
export type RemanejamentoSchema = z.infer<typeof remanejamentoSchema>;

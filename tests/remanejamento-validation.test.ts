import assert from "node:assert/strict";
import test from "node:test";

import { remanejamentoSchema } from "../lib/validations/remanejamento";

test("aceita lote com um item e valor com vírgula como decimal", () => {
  const parsed = remanejamentoSchema.parse({
    secretariaId: "sec-1",
    justificativa: "Remanejamento necessário para reequilíbrio orçamentário.",
    entries: [
      {
        destinoAcao: "2002",
        destinoFonte: "15000000",
        destinoElemento: "31901100",
        destinoValor: "1.500,75",
        origemAcao: "2002",
        origemFonte: "15000000",
        origemElemento: "31901100",
        origemValor: "1.500,75",
      },
    ],
  });

  assert.equal(parsed.entries[0].destinoValor, 1500.75);
  assert.equal(parsed.entries[0].origemValor, 1500.75);
});

test("aceita lote com dois itens", () => {
  const result = remanejamentoSchema.safeParse({
    secretariaId: "sec-1",
    justificativa: "Lote com duas movimentações para a mesma secretaria.",
    entries: [
      {
        destinoAcao: "4370",
        destinoFonte: "15000000",
        destinoElemento: "33903900",
        destinoValor: "15.000",
        origemAcao: "4370",
        origemFonte: "15000000",
        origemElemento: "33903000",
        origemValor: "15.000",
      },
      {
        destinoAcao: "4371",
        destinoFonte: "17040000",
        destinoElemento: "33904700",
        destinoValor: "2.500,50",
        origemAcao: "4371",
        origemFonte: "17040000",
        origemElemento: "33904700",
        origemValor: "2.500,50",
      },
    ],
  });

  assert.equal(result.success, true);
});

test("rejeita quando adição e anulação possuem valores diferentes", () => {
  const result = remanejamentoSchema.safeParse({
    secretariaId: "sec-1",
    justificativa: "Remanejamento necessário para reequilíbrio orçamentário.",
    entries: [
      {
        destinoAcao: "2002",
        destinoFonte: "15000000",
        destinoElemento: "31901100",
        destinoValor: "1500,75",
        origemAcao: "2002",
        origemFonte: "15000000",
        origemElemento: "31901100",
        origemValor: "1400,75",
      },
    ],
  });

  assert.equal(result.success, false);
});

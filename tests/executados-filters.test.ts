import test from "node:test";
import assert from "node:assert/strict";

import { buildExecutadosWhereClause } from "../services/remanejamento.service";

test("monta filtros completos para executados", () => {
  const where = buildExecutadosWhereClause({
    secretaria: "Finanças",
    cpf: "123.456.789-00",
    acao: "2002",
    fonte: "1500",
    elemento: "3190",
    dataInicial: "2026-01-01",
    dataFinal: "2026-01-31",
  });

  assert.equal(where.secretaria && "contains" in where.secretaria ? where.secretaria.contains : "", "Finanças");
  assert.equal(where.cpfSolicitante && "contains" in where.cpfSolicitante ? where.cpfSolicitante.contains : "", "12345678900");
  assert.ok(Array.isArray(where.AND));
  assert.equal(where.AND?.length, 3);
  assert.ok(where.dataRemanejamento);
  assert.equal(
    where.dataRemanejamento && "gte" in where.dataRemanejamento && where.dataRemanejamento.gte instanceof Date
      ? where.dataRemanejamento.gte.toISOString()
      : "",
    "2026-01-01T03:00:00.000Z",
  );
  assert.equal(
    where.dataRemanejamento && "lte" in where.dataRemanejamento && where.dataRemanejamento.lte instanceof Date
      ? where.dataRemanejamento.lte.toISOString()
      : "",
    "2026-02-01T02:59:59.999Z",
  );
});

import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import * as XLSX from "xlsx";

import { parseSecretariasFromSheetRows, type SheetRow } from "../lib/secretaria-catalog";

test("importa secretarias e catálogo por unidade orçamentária a partir da planilha oficial", () => {
  const filePath = path.join(process.cwd(), "dados das secretaria.xlsx");
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<SheetRow>(sheet, { header: 1, defval: null });

  const secretarias = parseSecretariasFromSheetRows(rows);
  const planejamento = secretarias.find((item) => item.unidadeOrcamentaria === "02008");
  const financas = secretarias.find((item) => item.unidadeOrcamentaria === "02002");

  assert.equal(secretarias.length, 24);
  assert.ok(planejamento);
  assert.equal(planejamento?.nomeSecretaria.includes("PLANEJAMENTO"), true);
  assert.ok((planejamento?.catalogItems.length ?? 0) > 5);
  assert.ok((financas?.catalogItems.length ?? 0) > 20);
});

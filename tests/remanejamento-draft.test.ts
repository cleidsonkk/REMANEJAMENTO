import test from "node:test";
import assert from "node:assert/strict";

import {
  buildRemanejamentoDraftKey,
  createEmptyRemanejamentoEntry,
  parseRemanejamentoDraft,
  serializeRemanejamentoDraft,
} from "../features/remanejamentos/remanejamento-draft";

test("gera chave de rascunho segregada por usuario", () => {
  assert.equal(buildRemanejamentoDraftKey("user-123"), "remanejamento-draft-v4:user-123");
});

test("restaura um rascunho valido com secretaria permitida", () => {
  const entry = createEmptyRemanejamentoEntry();
  entry.destinoAcao = "1001";
  entry.origemAcao = "2001";

  const raw = serializeRemanejamentoDraft(
    {
      secretariaId: "sec-2",
      justificativa: "Ajuste tecnico",
      entries: [entry],
    },
    1_000,
  );

  const restored = parseRemanejamentoDraft(raw, {
    fallbackSecretariaId: "sec-1",
    validSecretariaIds: ["sec-1", "sec-2"],
    now: 2_000,
  });

  assert.deepEqual(restored, {
    secretariaId: "sec-2",
    justificativa: "Ajuste tecnico",
    entries: [entry],
  });
});

test("descarta rascunho expirado", () => {
  const raw = serializeRemanejamentoDraft(
    {
      secretariaId: "sec-9",
      justificativa: "Expirado",
      entries: [createEmptyRemanejamentoEntry()],
    },
    1_000,
  );

  const restored = parseRemanejamentoDraft(raw, {
    fallbackSecretariaId: "sec-1",
    validSecretariaIds: ["sec-1"],
    now: 1_000 + 12 * 60 * 60 * 1000 + 1,
  });

  assert.equal(restored, null);
});

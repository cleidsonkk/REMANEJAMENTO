import assert from "node:assert/strict";
import test from "node:test";

import { groupRemanejamentosByLote } from "../services/remanejamento.service";

test("agrupa itens pelo lote e soma o valor total", () => {
  const groups = groupRemanejamentosByLote([
    {
      id: "1",
      protocolo: "REM-20260325-AAAA-01",
      loteProtocolo: "REM-20260325-AAAA",
      loteSequencia: 1,
      secretariaId: "sec-1",
      solicitanteId: "user-1",
      unidadeOrcamentaria: "02008",
      nomeSecretaria: "Planejamento",
      nomeSecretario: "Secretário",
      nomeSolicitante: "Solicitante",
      cpfSolicitante: "07363032513",
      justificativa: "Teste",
      status: "PENDENTE",
      dataSolicitacao: new Date("2026-03-25T10:00:00Z"),
      dataConclusao: null,
      destinoAcao: "1001",
      destinoFonte: "15000000",
      destinoElemento: "33903900",
      destinoValor: 100 as never,
      origemAcao: "1001",
      origemFonte: "15000000",
      origemElemento: "33903000",
      origemValor: 100 as never,
      createdAt: new Date("2026-03-25T10:00:00Z"),
      updatedAt: new Date("2026-03-25T10:00:00Z"),
    },
    {
      id: "2",
      protocolo: "REM-20260325-AAAA-02",
      loteProtocolo: "REM-20260325-AAAA",
      loteSequencia: 2,
      secretariaId: "sec-1",
      solicitanteId: "user-1",
      unidadeOrcamentaria: "02008",
      nomeSecretaria: "Planejamento",
      nomeSecretario: "Secretário",
      nomeSolicitante: "Solicitante",
      cpfSolicitante: "07363032513",
      justificativa: "Teste",
      status: "PENDENTE",
      dataSolicitacao: new Date("2026-03-25T10:00:00Z"),
      dataConclusao: null,
      destinoAcao: "1002",
      destinoFonte: "15000000",
      destinoElemento: "33903900",
      destinoValor: 250 as never,
      origemAcao: "1002",
      origemFonte: "15000000",
      origemElemento: "33903000",
      origemValor: 250 as never,
      createdAt: new Date("2026-03-25T10:01:00Z"),
      updatedAt: new Date("2026-03-25T10:01:00Z"),
    },
  ]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].loteProtocolo, "REM-20260325-AAAA");
  assert.equal(groups[0].totalItens, 2);
  assert.equal(groups[0].valorTotal, 350);
});

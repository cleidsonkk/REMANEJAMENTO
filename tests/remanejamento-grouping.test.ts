import assert from "node:assert/strict";
import test from "node:test";

import { getRemanejamentoCorrectionLinkage, getRemanejamentoCorrectionLinkageMap, groupRemanejamentosByLote } from "../services/remanejamento.service";

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

test("prioriza devolvido para correcao quando o lote nao esta mais pendente", () => {
  const groups = groupRemanejamentosByLote([
    {
      id: "1",
      protocolo: "REM-20260325-BBBB-01",
      loteProtocolo: "REM-20260325-BBBB",
      loteSequencia: 1,
      secretariaId: "sec-1",
      solicitanteId: "user-1",
      unidadeOrcamentaria: "02008",
      nomeSecretaria: "Planejamento",
      nomeSecretario: "Secretario",
      nomeSolicitante: "Solicitante",
      cpfSolicitante: "07363032513",
      justificativa: "Teste",
      status: "DEVOLVIDO_PARA_CORRECAO",
      dataSolicitacao: new Date("2026-03-25T10:00:00Z"),
      dataConclusao: new Date("2026-03-25T11:00:00Z"),
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
      protocolo: "REM-20260325-BBBB-02",
      loteProtocolo: "REM-20260325-BBBB",
      loteSequencia: 2,
      secretariaId: "sec-1",
      solicitanteId: "user-1",
      unidadeOrcamentaria: "02008",
      nomeSecretaria: "Planejamento",
      nomeSecretario: "Secretario",
      nomeSolicitante: "Solicitante",
      cpfSolicitante: "07363032513",
      justificativa: "Teste",
      status: "DEVOLVIDO_PARA_CORRECAO",
      dataSolicitacao: new Date("2026-03-25T10:00:00Z"),
      dataConclusao: new Date("2026-03-25T11:00:00Z"),
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
  assert.equal(groups[0].status, "DEVOLVIDO_PARA_CORRECAO");
});

test("identifica o lote original e o lote corrigido a partir da auditoria", () => {
  const sourceLinkage = getRemanejamentoCorrectionLinkage("REM-20260325-ORIG", [
    {
      id: "log-1",
      userId: "user-1",
      action: "RESUBMIT_FOR_CORRECTION",
      entity: "LoteRemanejamento",
      entityId: "REM-20260325-ORIG",
      oldData: null,
      newData: {
        sourceLoteProtocolo: "REM-20260325-ORIG",
        novoLoteProtocolo: "REM-20260325-NOVO",
      },
      timestamp: new Date("2026-03-25T12:00:00Z"),
    } as never,
  ]);

  const correctedLinkage = getRemanejamentoCorrectionLinkage("REM-20260325-NOVO", [
    {
      id: "log-2",
      userId: "user-1",
      action: "CREATE_BATCH",
      entity: "LoteRemanejamento",
      entityId: "REM-20260325-NOVO",
      oldData: null,
      newData: {
        loteProtocolo: "REM-20260325-NOVO",
        correctionSourceLoteProtocolo: "REM-20260325-ORIG",
      },
      timestamp: new Date("2026-03-25T12:05:00Z"),
    } as never,
  ]);

  assert.equal(sourceLinkage.correctedFromLoteProtocolo, null);
  assert.equal(sourceLinkage.correctedByLoteProtocolo, "REM-20260325-NOVO");
  assert.equal(correctedLinkage.correctedFromLoteProtocolo, "REM-20260325-ORIG");
  assert.equal(correctedLinkage.correctedByLoteProtocolo, null);
});

test("monta mapa de vinculos de correcao para varios lotes", () => {
  const linkageMap = getRemanejamentoCorrectionLinkageMap(
    ["REM-20260325-ORIG", "REM-20260325-NOVO"],
    [
      {
        id: "log-1",
        userId: "user-1",
        action: "RESUBMIT_FOR_CORRECTION",
        entity: "LoteRemanejamento",
        entityId: "REM-20260325-ORIG",
        oldData: null,
        newData: {
          sourceLoteProtocolo: "REM-20260325-ORIG",
          novoLoteProtocolo: "REM-20260325-NOVO",
        },
        timestamp: new Date("2026-03-25T12:00:00Z"),
      } as never,
      {
        id: "log-2",
        userId: "user-1",
        action: "CREATE_BATCH",
        entity: "LoteRemanejamento",
        entityId: "REM-20260325-NOVO",
        oldData: null,
        newData: {
          loteProtocolo: "REM-20260325-NOVO",
          correctionSourceLoteProtocolo: "REM-20260325-ORIG",
        },
        timestamp: new Date("2026-03-25T12:05:00Z"),
      } as never,
    ],
  );

  assert.equal(linkageMap["REM-20260325-ORIG"]?.correctedByLoteProtocolo, "REM-20260325-NOVO");
  assert.equal(linkageMap["REM-20260325-NOVO"]?.correctedFromLoteProtocolo, "REM-20260325-ORIG");
});

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { auth } from "@/lib/auth";
import { listRemanejamentosExecutados } from "@/services/remanejamento.service";

function mapExportRows(data: Awaited<ReturnType<typeof listRemanejamentosExecutados>>) {
  return data.map((item) => ({
    Protocolo: item.protocolo,
    "Data da solicitação": item.dataSolicitacao.toLocaleDateString("pt-BR"),
    "Data do remanejamento": item.dataRemanejamento.toLocaleDateString("pt-BR"),
    Secretaria: item.secretaria,
    "Unidade orçamentária": item.unidadeOrcamentaria,
    Secretário: item.nomeSecretario,
    Solicitante: item.nomeSolicitante,
    CPF: item.cpfSolicitante,
    Justificativa: item.justificativa,
    "Adição ação": item.adicaoAcao,
    "Adição fonte": item.adicaoFonte,
    "Adição elemento": item.adicaoElemento,
    "Adição valor": Number(item.adicaoValor),
    "Anulação ação": item.anulacaoAcao,
    "Anulação fonte": item.anulacaoFonte,
    "Anulação elemento": item.anulacaoElemento,
    "Anulação valor": Number(item.anulacaoValor),
  }));
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (session?.user.role !== "ADMIN_PLANEJAMENTO") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  const data = await listRemanejamentosExecutados({
    secretaria: url.searchParams.get("secretaria") ?? "",
    cpf: url.searchParams.get("cpf") ?? "",
    acao: url.searchParams.get("acao") ?? "",
    fonte: url.searchParams.get("fonte") ?? "",
    elemento: url.searchParams.get("elemento") ?? "",
    dataInicial: url.searchParams.get("dataInicial") ?? "",
    dataFinal: url.searchParams.get("dataFinal") ?? "",
  });

  const rows = mapExportRows(data);

  if (format === "csv") {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(worksheet);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="remanejamentos-executados.csv"',
      },
    });
  }

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Executados");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="remanejamentos-executados.xlsx"',
    },
  });
}

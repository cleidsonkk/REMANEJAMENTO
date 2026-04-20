import { access } from "node:fs/promises";
import path from "node:path";

import ExcelJS from "exceljs";
import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import * as XLSX from "xlsx";

import { auth } from "@/lib/auth";
import { formatCpf, formatCurrency, formatGovernmentCode } from "@/lib/utils";
import { listRemanejamentosExecutados } from "@/services/remanejamento.service";

type ExportFilters = {
  secretaria: string;
  cpf: string;
  acao: string;
  fonte: string;
  elemento: string;
  dataInicial: string;
  dataFinal: string;
};

type ExecutadoItem = Awaited<ReturnType<typeof listRemanejamentosExecutados>>[number];
type SummaryMetrics = ReturnType<typeof getSummaryMetrics>;
type SecretariaSummaryRow = {
  secretaria: string;
  unidadeOrcamentaria: string;
  registros: number;
  solicitantes: number;
  totalAdicao: number;
  totalAnulacao: number;
  ultimoRemanejamento: Date;
  loteMaisRecente: string;
};

const TABLE_HEADER_ROW_INDEX = 15;
const TABLE_COLUMNS = [
  "Lote / Protocolo",
  "Datas",
  "Secretaria / Unidade",
  "Solicitante",
  "Justificativa",
  "Adição",
  "Anulação",
] as const;
const PDF_MARGIN = 40;
const PDF_FONT_NAMES = {
  regular: "PdfSansRegular",
  bold: "PdfSansBold",
  italic: "PdfSansItalic",
  boldItalic: "PdfSansBoldItalic",
} as const;
const PDF_COLORS = {
  ink: "#0F172A",
  muted: "#475569",
  line: "#D7DBE0",
  panel: "#F7F4EE",
  accent: "#0B5F73",
  accentSoft: "#E6F0F3",
  gold: "#B98A3B",
  goldSoft: "#F6E8CB",
  success: "#0F766E",
  successSoft: "#DDF5EF",
} as const;
const REPORT_LOCALE = "pt-BR";
const REPORT_TIME_ZONE = "America/Sao_Paulo";
const REPORT_DATE_PARTS_FORMATTER = new Intl.DateTimeFormat(REPORT_LOCALE, {
  timeZone: REPORT_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const REPORT_DATE_TIME_PARTS_FORMATTER = new Intl.DateTimeFormat(REPORT_LOCALE, {
  timeZone: REPORT_TIME_ZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function formatDate(value: Date) {
  const parts = REPORT_DATE_PARTS_FORMATTER.formatToParts(value);
  const day = parts.find((part) => part.type === "day")?.value ?? "00";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";

  return `${day}/${month}/${year}`;
}

function formatDateTime(value: Date) {
  const { day, month, year, hour, minute } = getReportDateTimeParts(value);

  return `${day}/${month}/${year} ${hour}:${minute}`;
}

function getReportDateTimeParts(value: Date) {
  const parts = REPORT_DATE_TIME_PARTS_FORMATTER.formatToParts(value);

  return {
    year: parts.find((part) => part.type === "year")?.value ?? "0000",
    month: parts.find((part) => part.type === "month")?.value ?? "00",
    day: parts.find((part) => part.type === "day")?.value ?? "00",
    hour: parts.find((part) => part.type === "hour")?.value ?? "00",
    minute: parts.find((part) => part.type === "minute")?.value ?? "00",
  };
}

function formatFilterDate(value: string) {
  if (!value) {
    return "";
  }

  const [year, month, day] = value.split("-");
  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

function createFilenameSuffix(date = new Date()) {
  const { year, month, day, hour, minute } = getReportDateTimeParts(date);

  return `${year}${month}${day}-${hour}${minute}`;
}

function joinCompactValues(values: string[], multiline = false) {
  return values.filter(Boolean).join(multiline ? "\n" : " | ");
}

function buildCompactReportRow(item: ExecutadoItem, multiline = false) {
  return {
    loteProtocolo: joinCompactValues(
      [`Lote: ${item.loteProtocolo ?? item.protocolo}`, `Protocolo: ${item.protocolo}`],
      multiline,
    ),
    datas: joinCompactValues(
      [`Solicitação: ${formatDate(item.dataSolicitacao)}`, `Execução: ${formatDate(item.dataRemanejamento)}`],
      multiline,
    ),
    secretaria: joinCompactValues(
      [
        item.secretaria,
        `Unidade: ${formatGovernmentCode(item.unidadeOrcamentaria)}`,
        `Secretário: ${item.nomeSecretario}`,
      ],
      multiline,
    ),
    solicitante: joinCompactValues([item.nomeSolicitante, formatCpf(item.cpfSolicitante)], multiline),
    justificativa: item.justificativa,
    adicao: joinCompactValues(
      [
        `Ação: ${item.adicaoAcao}`,
        `Fonte: ${item.adicaoFonte}`,
        `Elemento: ${item.adicaoElemento}`,
        `Valor: ${formatCurrency(Number(item.adicaoValor))}`,
      ],
      multiline,
    ),
    anulacao: joinCompactValues(
      [
        `Ação: ${item.anulacaoAcao}`,
        `Fonte: ${item.anulacaoFonte}`,
        `Elemento: ${item.anulacaoElemento}`,
        `Valor: ${formatCurrency(Number(item.anulacaoValor))}`,
      ],
      multiline,
    ),
  };
}

function mapCsvRows(data: ExecutadoItem[]) {
  return data.map((item) => {
    const row = buildCompactReportRow(item, false);

    return {
      "Lote / Protocolo": row.loteProtocolo,
      Datas: row.datas,
      "Secretaria / Unidade": row.secretaria,
      Solicitante: row.solicitante,
      Justificativa: row.justificativa,
      Adição: row.adicao,
      Anulação: row.anulacao,
    };
  });
}

function buildFilterSummary(filters: ExportFilters) {
  const active = [
    filters.secretaria ? `Secretaria: ${filters.secretaria}` : null,
    filters.cpf ? `CPF: ${formatCpf(filters.cpf)}` : null,
    filters.acao ? `Ação: ${filters.acao}` : null,
    filters.fonte ? `Fonte: ${filters.fonte}` : null,
    filters.elemento ? `Elemento: ${filters.elemento}` : null,
    filters.dataInicial ? `Data inicial: ${formatFilterDate(filters.dataInicial)}` : null,
    filters.dataFinal ? `Data final: ${formatFilterDate(filters.dataFinal)}` : null,
  ].filter(Boolean);

  return active.length ? active.join(" | ") : "Sem filtros aplicados.";
}

function buildPeriodLabel(data: ExecutadoItem[], filters: ExportFilters) {
  if (filters.dataInicial || filters.dataFinal) {
    const start = filters.dataInicial ? formatFilterDate(filters.dataInicial) : "Início livre";
    const end = filters.dataFinal ? formatFilterDate(filters.dataFinal) : "Fim livre";
    return `${start} a ${end}`;
  }

  if (!data.length) {
    return "Sem registros no recorte";
  }

  const ordered = [...data].sort((left, right) => left.dataRemanejamento.getTime() - right.dataRemanejamento.getTime());
  return `${formatDate(ordered[0].dataRemanejamento)} a ${formatDate(ordered[ordered.length - 1].dataRemanejamento)}`;
}

function getSummaryMetrics(data: ExecutadoItem[], filters: ExportFilters) {
  const totalAdicao = data.reduce((sum, item) => sum + Number(item.adicaoValor), 0);
  const totalAnulacao = data.reduce((sum, item) => sum + Number(item.anulacaoValor), 0);
  const secretarias = new Set(data.map((item) => item.secretaria)).size;
  const solicitantes = new Set(data.map((item) => item.cpfSolicitante)).size;

  return {
    totalRegistros: data.length,
    totalAdicao,
    totalAnulacao,
    totalSecretarias: secretarias,
    totalSolicitantes: solicitantes,
    periodLabel: buildPeriodLabel(data, filters),
  };
}

function buildSecretariaSummaryRows(data: ExecutadoItem[]): SecretariaSummaryRow[] {
  const groups = new Map<string, SecretariaSummaryRow & { cpfs: Set<string> }>();

  for (const item of data) {
    const key = `${item.secretaria}::${item.unidadeOrcamentaria}`;
    const current = groups.get(key);

    if (!current) {
      groups.set(key, {
        secretaria: item.secretaria,
        unidadeOrcamentaria: formatGovernmentCode(item.unidadeOrcamentaria),
        registros: 1,
        solicitantes: 1,
        totalAdicao: Number(item.adicaoValor),
        totalAnulacao: Number(item.anulacaoValor),
        ultimoRemanejamento: item.dataRemanejamento,
        loteMaisRecente: item.loteProtocolo ?? item.protocolo,
        cpfs: new Set([item.cpfSolicitante]),
      });
      continue;
    }

    current.registros += 1;
    current.totalAdicao += Number(item.adicaoValor);
    current.totalAnulacao += Number(item.anulacaoValor);
    current.cpfs.add(item.cpfSolicitante);
    current.solicitantes = current.cpfs.size;

    if (item.dataRemanejamento > current.ultimoRemanejamento) {
      current.ultimoRemanejamento = item.dataRemanejamento;
      current.loteMaisRecente = item.loteProtocolo ?? item.protocolo;
    }
  }

  return Array.from(groups.values())
    .map(({ cpfs: _cpfs, ...item }) => item)
    .sort((left, right) => right.totalAdicao - left.totalAdicao);
}

function applyBorder(cell: ExcelJS.Cell, color = "FFD6D3D1") {
  cell.border = {
    top: { style: "thin", color: { argb: color } },
    left: { style: "thin", color: { argb: color } },
    bottom: { style: "thin", color: { argb: color } },
    right: { style: "thin", color: { argb: color } },
  };
}

function setMergedCellValue(
  worksheet: ExcelJS.Worksheet,
  range: string,
  value: string,
  args: {
    font?: Partial<ExcelJS.Font>;
    fill?: Partial<ExcelJS.Fill>;
    alignment?: Partial<ExcelJS.Alignment>;
    borderColor?: string;
  } = {},
) {
  worksheet.mergeCells(range);
  const cell = worksheet.getCell(range.split(":")[0]);
  cell.value = value;
  cell.font = { name: "Arial", ...args.font };
  cell.alignment = {
    vertical: "middle",
    horizontal: "left",
    wrapText: true,
    ...args.alignment,
  };

  if (args.fill) {
    cell.fill = args.fill as ExcelJS.Fill;
  }

  applyBorder(cell, args.borderColor);
}

function addInfoCard(
  worksheet: ExcelJS.Worksheet,
  args: {
    labelRange: string;
    valueRange: string;
    label: string;
    value: string;
  },
) {
  setMergedCellValue(worksheet, args.labelRange, args.label, {
    font: { size: 9, bold: true, color: { argb: "FF0F172A" } },
    fill: {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2E8F0" },
    },
  });

  setMergedCellValue(worksheet, args.valueRange, args.value, {
    font: { size: 10, color: { argb: "FF334155" } },
    fill: {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF8FAFC" },
    },
  });
}

function styleTableHeader(row: ExcelJS.Row) {
  row.height = 30;
  row.eachCell((cell) => {
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F3D4C" },
    };
    applyBorder(cell);
  });
}

function styleDataRow(row: ExcelJS.Row, index: number) {
  row.height = 56;
  row.eachCell((cell, columnNumber) => {
    cell.alignment = {
      vertical: "top",
      horizontal: "left",
      wrapText: true,
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: index % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC" },
    };
    applyBorder(cell, "FFE7E5E4");
  });
}

async function addLogo(workbook: ExcelJS.Workbook, worksheet: ExcelJS.Worksheet) {
  const logoPath = path.join(process.cwd(), "logo_prefeitura.png");

  try {
    await access(logoPath);
    const imageId = workbook.addImage({
      filename: logoPath,
      extension: "png",
    });

    worksheet.addImage(imageId, {
      tl: { col: 0.35, row: 0.55 },
      ext: { width: 104, height: 104 },
    });
  } catch {
    // If the logo is unavailable, the report remains valid without interrupting export.
  }
}

async function resolveLogoPath() {
  const logoPath = path.join(process.cwd(), "logo_prefeitura.png");

  try {
    await access(logoPath);
    return logoPath;
  } catch {
    return null;
  }
}

function getPdfFontPaths() {
  const base = path.join(process.cwd(), "assets", "fonts");

  return {
    regular: path.join(base, "source-sans-3-latin-400-normal.woff"),
    bold: path.join(base, "source-sans-3-latin-700-normal.woff"),
    italic: path.join(base, "source-sans-3-latin-400-italic.woff"),
    boldItalic: path.join(base, "source-sans-3-latin-600-normal.woff"),
  };
}

function drawPdfPageBase(doc: PDFKit.PDFDocument) {
  const { width, height } = doc.page;

  doc.save();
  doc.rect(0, 0, width, height).fill("#F3F0E8");
  doc.roundedRect(16, 16, width - 32, height - 32, 22).fill("#FFFFFF");
  doc.restore();
}

function drawPdfMetricCard(
  doc: PDFKit.PDFDocument,
  args: {
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    value: string;
    accent?: "teal" | "gold" | "green";
  },
) {
  const palette =
    args.accent === "gold"
      ? { bg: PDF_COLORS.goldSoft, fg: PDF_COLORS.gold }
      : args.accent === "green"
        ? { bg: PDF_COLORS.successSoft, fg: PDF_COLORS.success }
        : { bg: PDF_COLORS.accentSoft, fg: PDF_COLORS.accent };

  doc.save();
  doc.roundedRect(args.x, args.y, args.width, args.height, 16).fill(palette.bg);
  doc.roundedRect(args.x + 16, args.y + 14, 8, args.height - 28, 4).fill(palette.fg);
  doc.fillColor(PDF_COLORS.muted).font(PDF_FONT_NAMES.bold).fontSize(8).text(args.label.toUpperCase(), args.x + 34, args.y + 14, {
    width: args.width - 48,
  });
  doc.fillColor(PDF_COLORS.ink).font(PDF_FONT_NAMES.bold).fontSize(16).text(args.value, args.x + 34, args.y + 34, {
    width: args.width - 48,
  });
  doc.restore();
}

function drawPdfInfoBand(
  doc: PDFKit.PDFDocument,
  args: {
    x: number;
    y: number;
    width: number;
    label: string;
    value: string;
  },
) {
  doc.save();
  doc.roundedRect(args.x, args.y, args.width, 52, 14).fill(PDF_COLORS.panel);
  doc.fillColor(PDF_COLORS.muted).font(PDF_FONT_NAMES.bold).fontSize(8).text(args.label.toUpperCase(), args.x + 14, args.y + 12, {
    width: args.width - 28,
  });
  doc.fillColor(PDF_COLORS.ink).font(PDF_FONT_NAMES.regular).fontSize(10).text(args.value, args.x + 14, args.y + 26, {
    width: args.width - 28,
  });
  doc.restore();
}

function ensurePdfSpace(doc: PDFKit.PDFDocument, requiredHeight: number) {
  if (doc.y + requiredHeight <= doc.page.height - PDF_MARGIN - 26) {
    return;
  }

  doc.addPage();
  drawPdfPageBase(doc);
  doc.y = PDF_MARGIN;
}

function drawPdfSectionTitle(doc: PDFKit.PDFDocument, title: string, description?: string) {
  doc.fillColor(PDF_COLORS.ink).font(PDF_FONT_NAMES.bold).fontSize(16).text(title, PDF_MARGIN, doc.y, {
    width: doc.page.width - PDF_MARGIN * 2,
  });

  if (description) {
    doc.moveDown(0.25);
    doc.fillColor(PDF_COLORS.muted).font(PDF_FONT_NAMES.regular).fontSize(10).text(description, PDF_MARGIN, doc.y, {
      width: doc.page.width - PDF_MARGIN * 2,
    });
  }

  doc.moveDown(0.8);
}

function drawPdfSummaryTable(doc: PDFKit.PDFDocument, rows: SecretariaSummaryRow[]) {
  const columns = [
    { key: "secretaria", label: "Secretaria", width: 180, align: "left" as const },
    { key: "unidadeOrcamentaria", label: "Unidade", width: 60, align: "center" as const },
    { key: "registros", label: "Regs.", width: 48, align: "center" as const },
    { key: "solicitantes", label: "Solic.", width: 48, align: "center" as const },
    { key: "totalAdicao", label: "Adição", width: 80, align: "right" as const },
    { key: "totalAnulacao", label: "Anulação", width: 82, align: "right" as const },
    { key: "ultimoRemanejamento", label: "Último", width: 62, align: "center" as const },
  ];

  const drawHeader = () => {
    const top = doc.y;
    let left = PDF_MARGIN;

    for (const column of columns) {
      doc.save();
      doc.roundedRect(left, top, column.width, 24, 8).fill(PDF_COLORS.accent);
      doc.fillColor("#FFFFFF").font(PDF_FONT_NAMES.bold).fontSize(8).text(column.label, left + 6, top + 8, {
        width: column.width - 12,
        align: column.align,
      });
      doc.restore();
      left += column.width + 6;
    }

    doc.y = top + 30;
  };

  drawHeader();

  if (!rows.length) {
    doc.roundedRect(PDF_MARGIN, doc.y, doc.page.width - PDF_MARGIN * 2, 44, 14).fill(PDF_COLORS.panel);
    doc.fillColor(PDF_COLORS.muted).font(PDF_FONT_NAMES.italic).fontSize(10).text(
      "Nenhum resumo por secretaria disponível para o recorte atual.",
      PDF_MARGIN + 16,
      doc.y + 16,
      { width: doc.page.width - PDF_MARGIN * 2 - 32, align: "center" },
    );
    doc.y += 56;
    return;
  }

  rows.slice(0, 12).forEach((row, index) => {
    ensurePdfSpace(doc, 30);
    const top = doc.y;
    let left = PDF_MARGIN;

    doc.save();
    doc.roundedRect(PDF_MARGIN, top, doc.page.width - PDF_MARGIN * 2, 24, 10).fill(index % 2 === 0 ? "#FFFFFF" : "#FAFBFC");
    doc.restore();

    const values: Record<string, string> = {
      secretaria: row.secretaria,
      unidadeOrcamentaria: row.unidadeOrcamentaria,
      registros: String(row.registros),
      solicitantes: String(row.solicitantes),
      totalAdicao: formatCurrency(row.totalAdicao),
      totalAnulacao: formatCurrency(row.totalAnulacao),
      ultimoRemanejamento: formatDate(row.ultimoRemanejamento),
    };

    for (const column of columns) {
      doc.fillColor(PDF_COLORS.ink).font(PDF_FONT_NAMES.regular).fontSize(8.5).text(values[column.key], left + 6, top + 8, {
        width: column.width - 12,
        align: column.align,
      });
      left += column.width + 6;
    }

    doc.y = top + 28;
  });

  if (rows.length > 12) {
    doc.moveDown(0.4);
    doc.fillColor(PDF_COLORS.muted).font(PDF_FONT_NAMES.italic).fontSize(9).text(
      `Resumo apresentado com as 12 secretarias de maior volume. O detalhamento completo permanece no XLSX.`,
      PDF_MARGIN,
      doc.y,
      { width: doc.page.width - PDF_MARGIN * 2 },
    );
    doc.moveDown(0.6);
  }
}

function drawPdfRecordsTable(doc: PDFKit.PDFDocument, items: ExecutadoItem[]) {
  const tableGap = 6;
  const columns = [
    { key: "loteProtocolo", label: "Lote / Protocolo", width: 106, align: "left" as const },
    { key: "datas", label: "Datas", width: 74, align: "left" as const },
    { key: "secretaria", label: "Secretaria / Unidade", width: 168, align: "left" as const },
    { key: "solicitante", label: "Solicitante", width: 100, align: "left" as const },
    { key: "justificativa", label: "Justificativa", width: 150, align: "left" as const },
    { key: "adicao", label: "Adição", width: 64, align: "left" as const },
    { key: "anulacao", label: "Anulação", width: 64, align: "left" as const },
  ] satisfies Array<{
    key: keyof ReturnType<typeof buildCompactReportRow>;
    label: string;
    width: number;
    align: "left" | "center" | "right";
  }>;

  const drawHeader = () => {
    const top = doc.y;
    let left = PDF_MARGIN;

    for (const column of columns) {
      doc.save();
      doc.roundedRect(left, top, column.width, 24, 8).fill(PDF_COLORS.accent);
      doc.fillColor("#FFFFFF").font(PDF_FONT_NAMES.bold).fontSize(8).text(column.label, left + 6, top + 8, {
        width: column.width - 12,
        align: column.align,
      });
      doc.restore();
      left += column.width + tableGap;
    }

    doc.y = top + 30;
  };

  const startPage = (continued: boolean) => {
    doc.addPage({ size: "A4", layout: "landscape", margin: 0 });
    drawPdfPageBase(doc);
    doc.y = PDF_MARGIN;
    drawPdfSectionTitle(
      doc,
      continued ? "Detalhamento completo dos registros - continuação" : "Detalhamento completo dos registros",
      continued
        ? "Continuação do relatório em tabela compacta, padronizada para impressão em folha A4."
        : "Tabela compacta e completa, organizada para caber em A4 sem depender de rolagem horizontal.",
    );
    drawHeader();
  };

  const measureRowHeight = (row: ReturnType<typeof buildCompactReportRow>) => {
    doc.font(PDF_FONT_NAMES.regular).fontSize(7.5);

    const heights = columns.map((column) =>
      doc.heightOfString(row[column.key], {
        width: column.width - 10,
        align: column.align,
      }),
    );

    return Math.max(30, Math.ceil(Math.max(...heights) + 10));
  };

  if (!items.length) {
    startPage(false);
    doc.roundedRect(PDF_MARGIN, doc.y, doc.page.width - PDF_MARGIN * 2, 54, 16).fill(PDF_COLORS.panel);
    doc.fillColor(PDF_COLORS.muted).font(PDF_FONT_NAMES.italic).fontSize(10.5).text(
      "Nenhum registro executado foi localizado para os filtros informados.",
      PDF_MARGIN + 18,
      doc.y + 20,
      { width: doc.page.width - PDF_MARGIN * 2 - 36, align: "center" },
    );
    doc.y += 66;
    return;
  }

  startPage(false);

  items.forEach((item, index) => {
    const row = buildCompactReportRow(item, true);
    const rowHeight = measureRowHeight(row);

    if (doc.y + rowHeight > doc.page.height - PDF_MARGIN - 26) {
      startPage(true);
    }

    const top = doc.y;
    let left = PDF_MARGIN;

    doc.save();
    doc.roundedRect(PDF_MARGIN, top, doc.page.width - PDF_MARGIN * 2, rowHeight, 10).fill(
      index % 2 === 0 ? "#FFFFFF" : "#FAFBFC",
    );
    doc.restore();

    for (const column of columns) {
      doc.fillColor(PDF_COLORS.ink).font(PDF_FONT_NAMES.regular).fontSize(7.5).text(row[column.key], left + 5, top + 5, {
        width: column.width - 10,
        align: column.align,
      });
      left += column.width + tableGap;
    }

    doc.y = top + rowHeight + 6;
  });
}

async function buildPdfReport(args: {
  data: ExecutadoItem[];
  filters: ExportFilters;
  generatedBy: string;
}) {
  const generatedAt = new Date();
  const summary = getSummaryMetrics(args.data, args.filters);
  const secretarias = buildSecretariaSummaryRows(args.data);
  const logoPath = await resolveLogoPath();
  const fontPaths = getPdfFontPaths();

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 0,
      bufferPages: true,
      font: fontPaths.regular,
      info: {
        Title: "Relatório Executivo de Remanejamentos Executados",
        Author: "Sistema de Remanejamento Orçamentário",
        Subject: "Relatório institucional em PDF",
        Keywords: "prefeitura, remanejamento, relatório, pdf",
      },
    });

    doc.registerFont(PDF_FONT_NAMES.regular, fontPaths.regular);
    doc.registerFont(PDF_FONT_NAMES.bold, fontPaths.bold);
    doc.registerFont(PDF_FONT_NAMES.italic, fontPaths.italic);
    doc.registerFont(PDF_FONT_NAMES.boldItalic, fontPaths.boldItalic);
    doc.font(PDF_FONT_NAMES.regular);

    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    drawPdfPageBase(doc);

    doc.save();
    doc.roundedRect(PDF_MARGIN, 34, doc.page.width - PDF_MARGIN * 2, 112, 24).fill("#FCFBF8");
    doc.roundedRect(PDF_MARGIN, 34, doc.page.width - PDF_MARGIN * 2, 112, 24).lineWidth(1).stroke("#E7E5E4");
    doc.roundedRect(PDF_MARGIN, 34, 12, 112, 6).fill(PDF_COLORS.accent);
    doc.roundedRect(PDF_MARGIN + 16, 46, 118, 18, 9).fill(PDF_COLORS.accentSoft);
    doc.restore();

    if (logoPath) {
      doc.image(logoPath, PDF_MARGIN + 20, 58, { fit: [72, 72] });
    }

    doc.fillColor(PDF_COLORS.accent).font(PDF_FONT_NAMES.bold).fontSize(8.5).text(
      "PODER EXECUTIVO MUNICIPAL",
      148,
      50,
      { width: 180 },
    );
    doc.fillColor(PDF_COLORS.muted).font(PDF_FONT_NAMES.bold).fontSize(9).text(
      "PREFEITURA MUNICIPAL DE UMBAÚBA",
      148,
      68,
      { width: 250 },
    );
    doc.fillColor(PDF_COLORS.ink).font(PDF_FONT_NAMES.bold).fontSize(23).text(
      "Relatório Executivo de Remanejamentos Executados",
      148,
      84,
      { width: 268 },
    );
    doc.fillColor(PDF_COLORS.muted).font(PDF_FONT_NAMES.regular).fontSize(10.2).text(
      "Documento institucional para conferência administrativa, arquivo oficial e circulação interna controlada.",
      148,
      122,
      { width: 268 },
    );

    doc.save();
    doc.roundedRect(420, 46, 136, 88, 18).fill(PDF_COLORS.panel);
    doc.roundedRect(432, 60, 6, 58, 3).fill(PDF_COLORS.gold);
    doc.fillColor(PDF_COLORS.muted).font(PDF_FONT_NAMES.bold).fontSize(7.6).text("DOCUMENTO", 446, 58, { width: 92 });
    doc.fillColor(PDF_COLORS.ink).font(PDF_FONT_NAMES.bold).fontSize(10).text("RELATÓRIO OFICIAL", 446, 70, { width: 92 });
    doc.fillColor(PDF_COLORS.muted).font(PDF_FONT_NAMES.bold).fontSize(7.6).text("EMITIDO POR", 446, 90, { width: 92 });
    doc.fillColor(PDF_COLORS.ink).font(PDF_FONT_NAMES.bold).fontSize(9.6).text(args.generatedBy, 446, 102, { width: 92 });
    doc.fillColor(PDF_COLORS.muted).font(PDF_FONT_NAMES.bold).fontSize(7.6).text("DATA E HORA", 446, 118, { width: 92 });
    doc.fillColor(PDF_COLORS.ink).font(PDF_FONT_NAMES.regular).fontSize(8.8).text(formatDateTime(generatedAt), 446, 130, { width: 92 });
    doc.restore();

    doc.save();
    doc.roundedRect(PDF_MARGIN, 154, doc.page.width - PDF_MARGIN * 2, 4, 2).fill(PDF_COLORS.accent);
    doc.roundedRect(PDF_MARGIN, 160, 154, 3, 1.5).fill(PDF_COLORS.gold);
    doc.restore();

    drawPdfMetricCard(doc, {
      x: PDF_MARGIN,
      y: 178,
      width: 124,
      height: 78,
      label: "Total de registros",
      value: String(summary.totalRegistros),
      accent: "teal",
    });
    drawPdfMetricCard(doc, {
      x: 176,
      y: 178,
      width: 124,
      height: 78,
      label: "Secretarias",
      value: String(summary.totalSecretarias),
      accent: "gold",
    });
    drawPdfMetricCard(doc, {
      x: 312,
      y: 178,
      width: 124,
      height: 78,
      label: "Solicitantes",
      value: String(summary.totalSolicitantes),
      accent: "green",
    });
    drawPdfMetricCard(doc, {
      x: 448,
      y: 178,
      width: 108,
      height: 78,
      label: "Período",
      value: summary.periodLabel,
      accent: "teal",
    });

    drawPdfInfoBand(doc, {
      x: PDF_MARGIN,
      y: 272,
      width: 252,
      label: "Filtros aplicados",
      value: buildFilterSummary(args.filters),
    });
    drawPdfInfoBand(doc, {
      x: 306,
      y: 272,
      width: 126,
      label: "Total de adição",
      value: formatCurrency(summary.totalAdicao),
    });
    drawPdfInfoBand(doc, {
      x: 446,
      y: 272,
      width: 126,
      label: "Total de anulação",
      value: formatCurrency(summary.totalAnulacao),
    });

    doc.y = 350;
    drawPdfSectionTitle(
      doc,
      "Resumo gerencial por secretaria",
      "Leitura executiva do volume movimentado, quantidade de registros e última referência executada.",
    );
    drawPdfSummaryTable(doc, secretarias);

    drawPdfRecordsTable(doc, args.data);

    const range = doc.bufferedPageRange();
    for (let pageIndex = 0; pageIndex < range.count; pageIndex += 1) {
      doc.switchToPage(pageIndex);
      doc.save();
      doc.font(PDF_FONT_NAMES.regular).fontSize(8).fillColor(PDF_COLORS.muted).text(
        `Prefeitura Municipal de Umbaúba • Relatório Executivo de Remanejamentos Executados`,
        PDF_MARGIN,
        doc.page.height - 36,
        { width: 360 },
      );
      doc.text(`Página ${pageIndex + 1} de ${range.count}`, doc.page.width - PDF_MARGIN - 90, doc.page.height - 36, {
        width: 90,
        align: "right",
      });
      doc.restore();
    }

    doc.end();
  });
}

async function addSecretariaSummaryWorksheet(args: {
  workbook: ExcelJS.Workbook;
  data: ExecutadoItem[];
  generatedAt: Date;
  generatedBy: string;
  summary: ReturnType<typeof getSummaryMetrics>;
}) {
  const worksheet = args.workbook.addWorksheet("Resumo por Secretaria", {
    views: [{ state: "frozen", ySplit: 8 }],
    pageSetup: {
      orientation: "landscape",
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.35,
        right: 0.35,
        top: 0.4,
        bottom: 0.45,
        header: 0.2,
        footer: 0.2,
      },
    },
  });

  worksheet.properties.defaultRowHeight = 20;
  worksheet.pageSetup.printTitlesRow = "8:8";
  worksheet.headerFooter.oddFooter =
    "&LPrefeitura Municipal de Umbaúba&CResumo por Secretaria&RPágina &P de &N";

  worksheet.columns = [
    { key: "secretaria", width: 38 },
    { key: "unidadeOrcamentaria", width: 18 },
    { key: "registros", width: 14 },
    { key: "solicitantes", width: 14 },
    { key: "totalAdicao", width: 18 },
    { key: "totalAnulacao", width: 18 },
    { key: "ultimoRemanejamento", width: 18 },
    { key: "loteMaisRecente", width: 24 },
  ];

  worksheet.getRow(1).height = 28;
  worksheet.getRow(2).height = 24;
  worksheet.getRow(3).height = 22;
  worksheet.getRow(5).height = 20;
  worksheet.getRow(6).height = 22;

  setMergedCellValue(worksheet, "C1:H1", "RESUMO EXECUTIVO POR SECRETARIA", {
    font: { size: 16, bold: true, color: { argb: "FF0F172A" } },
  });
  setMergedCellValue(
    worksheet,
    "C2:H2",
    "Consolidado gerencial com volume financeiro, quantidade de registros e última referência executada.",
    {
      font: { size: 10, color: { argb: "FF475569" } },
    },
  );
  setMergedCellValue(worksheet, "C3:H3", `Emitido por ${args.generatedBy} em ${formatDateTime(args.generatedAt)}`, {
    font: { size: 10, color: { argb: "FF334155" } },
  });

  const dividerCell = worksheet.getCell("A4");
  worksheet.mergeCells("A4:H4");
  dividerCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F3D4C" },
  };

  addInfoCard(worksheet, {
    labelRange: "A5:B5",
    valueRange: "A6:B6",
    label: "Total de secretarias",
    value: String(args.summary.totalSecretarias),
  });
  addInfoCard(worksheet, {
    labelRange: "C5:D5",
    valueRange: "C6:D6",
    label: "Total de registros",
    value: String(args.summary.totalRegistros),
  });
  addInfoCard(worksheet, {
    labelRange: "E5:F5",
    valueRange: "E6:F6",
    label: "Adição consolidada",
    value: formatCurrency(args.summary.totalAdicao),
  });
  addInfoCard(worksheet, {
    labelRange: "G5:H5",
    valueRange: "G6:H6",
    label: "Anulação consolidada",
    value: formatCurrency(args.summary.totalAnulacao),
  });

  await addLogo(args.workbook, worksheet);

  const headerRow = worksheet.getRow(8);
  headerRow.values = [
    "Secretaria",
    "Unidade orçamentária",
    "Registros",
    "Solicitantes",
    "Total de adição",
    "Total de anulação",
    "Último remanejamento",
    "Lote mais recente",
  ];
  styleTableHeader(headerRow);

  const rows = buildSecretariaSummaryRows(args.data);

  if (rows.length) {
    for (const [index, item] of rows.entries()) {
      const row = worksheet.addRow(item);
      row.height = 22;
      row.eachCell((cell, columnNumber) => {
        cell.alignment = {
          vertical: "middle",
          horizontal: columnNumber >= 3 && columnNumber <= 7 ? "center" : "left",
          wrapText: true,
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: index % 2 === 0 ? "FFFFFFFF" : "FFF8FAFC" },
        };
        applyBorder(cell, "FFE7E5E4");
      });
      row.getCell(5).numFmt = '"R$" #,##0.00';
      row.getCell(6).numFmt = '"R$" #,##0.00';
      row.getCell(7).numFmt = "dd/mm/yyyy";
    }
  } else {
    worksheet.mergeCells("A9:H10");
    const emptyCell = worksheet.getCell("A9");
    emptyCell.value = "Nenhum executado disponível para consolidar por secretaria neste recorte.";
    emptyCell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    emptyCell.font = { name: "Arial", size: 11, italic: true, color: { argb: "FF475569" } };
    emptyCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF8FAFC" },
    };
    applyBorder(emptyCell, "FFE2E8F0");
    worksheet.getRow(9).height = 28;
    worksheet.getRow(10).height = 28;
  }
}

async function buildBrandedWorkbook(args: {
  data: ExecutadoItem[];
  filters: ExportFilters;
  generatedBy: string;
}) {
  const workbook = new ExcelJS.Workbook();
  const generatedAt = new Date();
  const summary = getSummaryMetrics(args.data, args.filters);

  workbook.creator = "Sistema de Remanejamento Orçamentário";
  workbook.company = "Prefeitura Municipal de Umbauba";
  workbook.subject = "Relatório de Remanejamentos Executados";
  workbook.keywords = "remanejamento, orçamento, prefeitura, relatório";
  workbook.created = generatedAt;
  workbook.modified = generatedAt;

  const worksheet = workbook.addWorksheet("Relatório Executado", {
    views: [{ state: "frozen", ySplit: TABLE_HEADER_ROW_INDEX }],
    pageSetup: {
      orientation: "landscape",
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      horizontalCentered: true,
      verticalCentered: false,
      margins: {
        left: 0.3,
        right: 0.3,
        top: 0.4,
        bottom: 0.45,
        header: 0.2,
        footer: 0.2,
      },
    },
  });

  worksheet.properties.defaultRowHeight = 20;
  worksheet.pageSetup.printTitlesRow = `${TABLE_HEADER_ROW_INDEX}:${TABLE_HEADER_ROW_INDEX}`;
  worksheet.headerFooter.oddFooter =
    "&LPrefeitura Municipal de Umbauba&CRelatório de Remanejamentos Executados&RPágina &P de &N";

  worksheet.columns = [
    { key: "loteProtocolo", width: 18 },
    { key: "datas", width: 18 },
    { key: "secretaria", width: 30 },
    { key: "solicitante", width: 22 },
    { key: "justificativa", width: 36 },
    { key: "adicao", width: 20 },
    { key: "anulacao", width: 20 },
  ];

  worksheet.getRow(1).height = 28;
  worksheet.getRow(2).height = 24;
  worksheet.getRow(3).height = 22;
  worksheet.getRow(5).height = 20;
  worksheet.getRow(6).height = 22;
  worksheet.getRow(8).height = 20;
  worksheet.getRow(9).height = 24;
  worksheet.getRow(11).height = 20;
  worksheet.getRow(12).height = 24;

  setMergedCellValue(worksheet, "B1:G1", "PREFEITURA MUNICIPAL DE UMBAUBA", {
    font: { size: 16, bold: true, color: { argb: "FF0F172A" } },
  });
  setMergedCellValue(worksheet, "B2:G2", "Relatório de Remanejamentos Executados", {
    font: { size: 13, bold: true, color: { argb: "FF0B5F73" } },
  });
  setMergedCellValue(
    worksheet,
    "B3:G3",
    "Exportação institucional compacta, pronta para leitura e impressão em folha A4.",
    {
      font: { size: 10, color: { argb: "FF475569" } },
    },
  );

  const dividerCell = worksheet.getCell("A4");
  worksheet.mergeCells("A4:G4");
  dividerCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F3D4C" },
  };

  addInfoCard(worksheet, {
    labelRange: "A5:C5",
    valueRange: "A6:C6",
    label: "Documento",
    value: "Relatório compacto institucional",
  });
  addInfoCard(worksheet, {
    labelRange: "D5:E5",
    valueRange: "D6:E6",
    label: "Emitido por",
    value: args.generatedBy,
  });
  addInfoCard(worksheet, {
    labelRange: "F5:G5",
    valueRange: "F6:G6",
    label: "Emitido em",
    value: formatDateTime(generatedAt),
  });

  addInfoCard(worksheet, {
    labelRange: "A8:C8",
    valueRange: "A9:C9",
    label: "Filtros aplicados",
    value: buildFilterSummary(args.filters),
  });
  addInfoCard(worksheet, {
    labelRange: "D8:E8",
    valueRange: "D9:E9",
    label: "Período considerado",
    value: summary.periodLabel,
  });
  addInfoCard(worksheet, {
    labelRange: "F8:G8",
    valueRange: "F9:G9",
    label: "Abrangência",
    value: `${summary.totalRegistros} registros | ${summary.totalSecretarias} secretarias | ${summary.totalSolicitantes} solicitantes`,
  });

  addInfoCard(worksheet, {
    labelRange: "A11:C11",
    valueRange: "A12:C12",
    label: "Observação",
    value: args.data.length
      ? "Relatório pronto para conferência administrativa, envio interno e arquivamento."
      : "Nenhum executado foi encontrado para o recorte informado.",
  });
  addInfoCard(worksheet, {
    labelRange: "D11:E11",
    valueRange: "D12:E12",
    label: "Total de adição",
    value: formatCurrency(summary.totalAdicao),
  });
  addInfoCard(worksheet, {
    labelRange: "F11:G11",
    valueRange: "F12:G12",
    label: "Total de anulação",
    value: formatCurrency(summary.totalAnulacao),
  });

  await addLogo(workbook, worksheet);

  const headerRow = worksheet.getRow(TABLE_HEADER_ROW_INDEX);
  headerRow.values = [...TABLE_COLUMNS];
  styleTableHeader(headerRow);

  worksheet.autoFilter = {
    from: { row: TABLE_HEADER_ROW_INDEX, column: 1 },
    to: { row: TABLE_HEADER_ROW_INDEX, column: TABLE_COLUMNS.length },
  };

  if (args.data.length) {
    for (const [index, item] of args.data.entries()) {
      const compactRow = buildCompactReportRow(item, true);
      const row = worksheet.addRow({
        loteProtocolo: compactRow.loteProtocolo,
        datas: compactRow.datas,
        secretaria: compactRow.secretaria,
        solicitante: compactRow.solicitante,
        justificativa: compactRow.justificativa,
        adicao: compactRow.adicao,
        anulacao: compactRow.anulacao,
      });

      styleDataRow(row, index);
    }

    const totalRow = worksheet.addRow({
      loteProtocolo: "Totais consolidados",
      datas: `${summary.totalRegistros} registro(s)`,
      secretaria: `${summary.totalSecretarias} secretaria(s)`,
      solicitante: `${summary.totalSolicitantes} solicitante(s)`,
      justificativa: "Consolidação final do recorte exportado.",
      adicao: `Total\n${formatCurrency(summary.totalAdicao)}`,
      anulacao: `Total\n${formatCurrency(summary.totalAnulacao)}`,
    });

    totalRow.height = 34;
    totalRow.eachCell((cell) => {
      cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FF0F172A" } };
      cell.alignment = {
        vertical: "middle",
        horizontal: "left",
        wrapText: true,
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE2E8F0" },
      };
      applyBorder(cell, "FFCBD5E1");
    });
  } else {
    worksheet.mergeCells(`A${TABLE_HEADER_ROW_INDEX + 1}:G${TABLE_HEADER_ROW_INDEX + 2}`);
    const emptyCell = worksheet.getCell(`A${TABLE_HEADER_ROW_INDEX + 1}`);
    emptyCell.value =
      "Nenhum registro executado foi localizado para os filtros informados. Ajuste os parâmetros e gere o relatório novamente.";
    emptyCell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    emptyCell.font = { name: "Arial", size: 11, italic: true, color: { argb: "FF475569" } };
    emptyCell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF8FAFC" },
    };
    applyBorder(emptyCell, "FFE2E8F0");
    worksheet.getRow(TABLE_HEADER_ROW_INDEX + 1).height = 28;
    worksheet.getRow(TABLE_HEADER_ROW_INDEX + 2).height = 28;
  }

  const footnoteRowIndex = worksheet.rowCount + 2;
  worksheet.mergeCells(`A${footnoteRowIndex}:G${footnoteRowIndex}`);
  const footnoteCell = worksheet.getCell(`A${footnoteRowIndex}`);
  footnoteCell.value =
    "Documento gerado automaticamente pelo Sistema de Remanejamento Orçamentário da Prefeitura Municipal de Umbaúba.";
  footnoteCell.font = {
    name: "Arial",
    size: 10,
    italic: true,
    color: { argb: "FF475569" },
  };
  footnoteCell.alignment = { vertical: "middle", horizontal: "left" };

  await addSecretariaSummaryWorksheet({
    workbook,
    data: args.data,
    generatedAt,
    generatedBy: args.generatedBy,
    summary,
  });

  return workbook.xlsx.writeBuffer();
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (session?.user.role !== "ADMIN_PLANEJAMENTO") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const url = new URL(request.url);
  const requestedFormat = url.searchParams.get("format");
  const format = requestedFormat === "xlsx" || requestedFormat === "pdf" ? requestedFormat : "csv";
  const filters = {
    secretaria: url.searchParams.get("secretaria") ?? "",
    cpf: url.searchParams.get("cpf") ?? "",
    acao: url.searchParams.get("acao") ?? "",
    fonte: url.searchParams.get("fonte") ?? "",
    elemento: url.searchParams.get("elemento") ?? "",
    dataInicial: url.searchParams.get("dataInicial") ?? "",
    dataFinal: url.searchParams.get("dataFinal") ?? "",
  } satisfies ExportFilters;

  const data = await listRemanejamentosExecutados(filters);
  const filenameSuffix = createFilenameSuffix();

  if (format === "csv") {
    const worksheet = XLSX.utils.json_to_sheet(mapCsvRows(data));
    const csv = `\uFEFF${XLSX.utils.sheet_to_csv(worksheet)}`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="remanejamentos-executados-${filenameSuffix}.csv"`,
      },
    });
  }

  if (format === "pdf") {
    const buffer = await buildPdfReport({
      data,
      filters,
      generatedBy: session.user.name ?? "Administrador",
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="relatorio-remanejamentos-executados-${filenameSuffix}.pdf"`,
      },
    });
  }

  const buffer = await buildBrandedWorkbook({
    data,
    filters,
    generatedBy: session.user.name ?? "Administrador",
  });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="relatorio-remanejamentos-executados-${filenameSuffix}.xlsx"`,
    },
  });
}

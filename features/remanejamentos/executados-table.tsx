"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useMemo } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { formatCpf, formatCurrency, formatGovernmentCode } from "@/lib/utils";

type ExecutadoRow = {
  protocolo: string;
  dataRemanejamento: string;
  secretaria: string;
  unidadeOrcamentaria: string;
  nomeSecretario: string;
  nomeSolicitante: string;
  cpfSolicitante: string;
  adicaoAcao: string;
  adicaoFonte: string;
  adicaoElemento: string;
  adicaoValor: number;
  anulacaoAcao: string;
  anulacaoFonte: string;
  anulacaoElemento: string;
  anulacaoValor: number;
};

const helper = createColumnHelper<ExecutadoRow>();

function MovimentacaoCompacta({
  acao,
  fonte,
  elemento,
  valor,
  tone,
}: {
  acao: string;
  fonte: string;
  elemento: string;
  valor: number;
  tone: "emerald" | "amber";
}) {
  const palette =
    tone === "emerald"
      ? "border-emerald-200/70 bg-emerald-50/70 text-emerald-950"
      : "border-amber-200/70 bg-amber-50/70 text-amber-950";

  return (
    <div className={`rounded-2xl border px-3 py-2 ${palette}`}>
      <div className="space-y-1.5 text-[12px] leading-5">
        <p>
          <span className="font-semibold">Ação:</span> {acao}
        </p>
        <p>
          <span className="font-semibold">Fonte:</span> {fonte}
        </p>
        <p>
          <span className="font-semibold">Elemento:</span> {elemento}
        </p>
        <p className="pt-1 text-sm font-semibold">{formatCurrency(valor)}</p>
      </div>
    </div>
  );
}

export function ExecutadosTable({ data }: { data: ExecutadoRow[] }) {
  const columns = useMemo(
    () => [
      helper.accessor("protocolo", {
        header: "Protocolo",
        cell: (info) => (
          <div className="min-w-[150px]">
            <p className="font-semibold text-slate-950">{info.getValue()}</p>
            <p className="mt-1 text-xs text-slate-500">Executado em {info.row.original.dataRemanejamento}</p>
          </div>
        ),
      }),
      helper.accessor("secretaria", {
        header: "Secretaria",
        cell: (info) => (
          <div className="min-w-[250px]">
            <p className="font-semibold text-slate-950">{info.getValue()}</p>
            <p className="mt-1 text-xs text-slate-500">
              Unidade {formatGovernmentCode(info.row.original.unidadeOrcamentaria)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Secretário: {info.row.original.nomeSecretario}</p>
          </div>
        ),
      }),
      helper.accessor("nomeSolicitante", {
        header: "Solicitante",
        cell: (info) => (
          <div className="min-w-[180px]">
            <p className="font-semibold text-slate-950">{info.getValue()}</p>
            <p className="mt-1 text-xs text-slate-500">{formatCpf(info.row.original.cpfSolicitante)}</p>
          </div>
        ),
      }),
      helper.display({
        id: "adicao",
        header: "Adição",
        cell: (info) => (
          <div className="min-w-[210px]">
            <MovimentacaoCompacta
              acao={info.row.original.adicaoAcao}
              elemento={info.row.original.adicaoElemento}
              fonte={info.row.original.adicaoFonte}
              tone="emerald"
              valor={info.row.original.adicaoValor}
            />
          </div>
        ),
      }),
      helper.display({
        id: "anulacao",
        header: "Anulação",
        cell: (info) => (
          <div className="min-w-[210px]">
            <MovimentacaoCompacta
              acao={info.row.original.anulacaoAcao}
              elemento={info.row.original.anulacaoElemento}
              fonte={info.row.original.anulacaoFonte}
              tone="amber"
              valor={info.row.original.anulacaoValor}
            />
          </div>
        ),
      }),
    ],
    [],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  if (!data.length) {
    return (
      <EmptyState
        title="Nenhum remanejamento executado encontrado"
        description="Ajuste os filtros e tente novamente para localizar execuções por período, CPF, secretaria ou parâmetros orçamentários."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="table-safe">
        <table className="min-w-[1120px] text-sm">
          <thead className="bg-[linear-gradient(180deg,#f8fafc,#eef2f7)] text-slate-900">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3 text-left font-semibold">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t border-slate-200/80 align-top">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 rounded-[1.25rem] border bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
        </p>
        <div className="flex items-center gap-2">
          <Button disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()} type="button" variant="outline">
            Anterior
          </Button>
          <Button disabled={!table.getCanNextPage()} onClick={() => table.nextPage()} type="button" variant="outline">
            Próxima
          </Button>
        </div>
      </div>
    </div>
  );
}

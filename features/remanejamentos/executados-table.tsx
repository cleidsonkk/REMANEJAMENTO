"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { CalendarDays, Landmark, ReceiptText, UserRound } from "lucide-react";
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

export function ExecutadosTable({ data }: { data: ExecutadoRow[] }) {
  const columns = useMemo(
    () => [
      helper.accessor("protocolo", { header: "Protocolo" }),
      helper.accessor("dataRemanejamento", { header: "Data" }),
      helper.accessor("secretaria", { header: "Secretaria" }),
      helper.accessor("unidadeOrcamentaria", {
        header: "Unidade",
        cell: (info) => formatGovernmentCode(info.getValue()),
      }),
      helper.accessor("nomeSecretario", { header: "Secretário" }),
      helper.accessor("nomeSolicitante", { header: "Solicitante" }),
      helper.accessor("cpfSolicitante", {
        header: "CPF",
        cell: (info) => formatCpf(info.getValue()),
      }),
      helper.accessor("adicaoAcao", { header: "Adição ação" }),
      helper.accessor("adicaoFonte", { header: "Adição fonte" }),
      helper.accessor("adicaoElemento", { header: "Adição elemento" }),
      helper.accessor("adicaoValor", {
        header: "Adição valor",
        cell: (info) => formatCurrency(info.getValue()),
      }),
      helper.accessor("anulacaoAcao", { header: "Anulação ação" }),
      helper.accessor("anulacaoFonte", { header: "Anulação fonte" }),
      helper.accessor("anulacaoElemento", { header: "Anulação elemento" }),
      helper.accessor("anulacaoValor", {
        header: "Anulação valor",
        cell: (info) => formatCurrency(info.getValue()),
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
        pageSize: 8,
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
      <div className="hidden overflow-x-auto rounded-2xl border bg-white xl:block">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/60">
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
              <tr key={row.id} className="border-t align-top">
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

      <div className="grid gap-4 xl:hidden">
        {table.getRowModel().rows.map((row) => {
          const item = row.original;

          return (
            <article key={row.id} className="rounded-[1.75rem] border bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Protocolo</p>
                  <p className="mt-1 text-lg font-semibold">{item.protocolo}</p>
                </div>
                <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">Executado</span>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border bg-muted/35 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Landmark className="h-4 w-4 text-primary" />
                    Dados institucionais
                  </div>
                  <div className="mt-3 space-y-2 text-sm">
                    <p>{item.secretaria}</p>
                    <p className="text-muted-foreground">Unidade {formatGovernmentCode(item.unidadeOrcamentaria)}</p>
                    <p className="text-muted-foreground">Secretário: {item.nomeSecretario}</p>
                  </div>
                </div>

                <div className="rounded-2xl border bg-muted/35 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <UserRound className="h-4 w-4 text-primary" />
                    Solicitante
                  </div>
                  <div className="mt-3 space-y-2 text-sm">
                    <p>{item.nomeSolicitante}</p>
                    <p className="text-muted-foreground">{formatCpf(item.cpfSolicitante)}</p>
                    <p className="inline-flex items-center gap-2 text-muted-foreground">
                      <CalendarDays className="h-4 w-4" />
                      {item.dataRemanejamento}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-emerald-950">
                    <ReceiptText className="h-4 w-4" />
                    Adição
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-emerald-950/85">
                    <p>Ação: {item.adicaoAcao}</p>
                    <p>Fonte: {item.adicaoFonte}</p>
                    <p>Elemento: {item.adicaoElemento}</p>
                    <p className="font-semibold">{formatCurrency(item.adicaoValor)}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-200/70 bg-amber-50/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-amber-950">
                    <ReceiptText className="h-4 w-4" />
                    Anulação
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-amber-950/85">
                    <p>Ação: {item.anulacaoAcao}</p>
                    <p>Fonte: {item.anulacaoFonte}</p>
                    <p>Elemento: {item.anulacaoElemento}</p>
                    <p className="font-semibold">{formatCurrency(item.anulacaoValor)}</p>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
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

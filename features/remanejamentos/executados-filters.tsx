"use client";

import { Filter, RotateCcw, Save, Sheet, Table2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FilterValues = {
  secretaria: string;
  cpf: string;
  acao: string;
  fonte: string;
  elemento: string;
  dataInicial: string;
  dataFinal: string;
};

type ExecutadosFiltersProps = {
  initialValues: FilterValues;
};

const FILTER_STORAGE_KEY = "executados-filters-v1";

function buildExportHref(values: FilterValues, format: "csv" | "xlsx") {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value) {
      search.set(key, value);
    }
  }
  search.set("format", format);
  return `/api/executados/export?${search.toString()}`;
}

function hasActiveFilters(values: FilterValues) {
  return Object.values(values).some(Boolean);
}

export function ExecutadosFilters({ initialValues }: ExecutadosFiltersProps) {
  const [values, setValues] = useState(initialValues);
  const [loadedFromStorage, setLoadedFromStorage] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(FILTER_STORAGE_KEY);
    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved) as Partial<FilterValues>;
      setValues((current) => ({ ...current, ...parsed }));
      setLoadedFromStorage(true);
    } catch {
      localStorage.removeItem(FILTER_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(values));
  }, [values]);

  const exportCsvHref = useMemo(() => buildExportHref(values, "csv"), [values]);
  const exportXlsxHref = useMemo(() => buildExportHref(values, "xlsx"), [values]);
  const activeFilters = hasActiveFilters(values);

  return (
    <form className="space-y-4 rounded-[1.5rem] border bg-muted/35 p-4" method="GET">
      <div className="flex flex-col gap-3 rounded-[1.25rem] border bg-white px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <Filter className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold">Filtros consolidados de executados</p>
            <p className="text-sm text-muted-foreground">
              Use período, CPF e parâmetros orçamentários para localizar execuções específicas e exportar o recorte atual.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold",
              activeFilters ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600",
            )}
          >
            <Save className="h-3.5 w-3.5" />
            {loadedFromStorage ? "Filtros restaurados do navegador" : activeFilters ? "Filtros prontos para consulta" : "Sem filtros ativos"}
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { id: "secretaria", label: "Secretaria", placeholder: "Ex.: Finanças" },
          { id: "cpf", label: "CPF", placeholder: "Digite o CPF do solicitante" },
          { id: "acao", label: "Ação", placeholder: "Código ou descrição da ação" },
          { id: "fonte", label: "Fonte", placeholder: "Fonte orçamentária" },
          { id: "elemento", label: "Elemento", placeholder: "Elemento de despesa" },
        ].map((field) => (
          <div key={field.id}>
            <label className="mb-2 block text-sm font-medium" htmlFor={field.id}>
              {field.label}
            </label>
            <input
              className="h-11 w-full rounded-xl border bg-white px-3 text-sm"
              id={field.id}
              name={field.id}
              placeholder={field.placeholder}
              value={values[field.id as keyof FilterValues]}
              onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value }))}
            />
          </div>
        ))}
        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor="dataInicial">
            Data inicial
          </label>
          <input
            className="h-11 w-full rounded-xl border bg-white px-3 text-sm"
            id="dataInicial"
            name="dataInicial"
            type="date"
            value={values.dataInicial}
            onChange={(event) => setValues((current) => ({ ...current, dataInicial: event.target.value }))}
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor="dataFinal">
            Data final
          </label>
          <input
            className="h-11 w-full rounded-xl border bg-white px-3 text-sm"
            id="dataFinal"
            name="dataFinal"
            type="date"
            value={values.dataFinal}
            onChange={(event) => setValues((current) => ({ ...current, dataFinal: event.target.value }))}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-3">
          <Button type="submit">Aplicar filtros</Button>
          <a
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border bg-white px-4 text-sm font-medium"
            href="/dashboard/executados"
            onClick={() => localStorage.removeItem(FILTER_STORAGE_KEY)}
          >
            <RotateCcw className="h-4 w-4" />
            Limpar
          </a>
        </div>
        <div className="flex flex-wrap gap-3">
          <a className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border bg-white px-4 text-sm font-medium" href={exportCsvHref}>
            <Table2 className="h-4 w-4" />
            Exportar CSV
          </a>
          <a className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border bg-white px-4 text-sm font-medium" href={exportXlsxHref}>
            <Sheet className="h-4 w-4" />
            Exportar XLSX
          </a>
        </div>
      </div>
    </form>
  );
}

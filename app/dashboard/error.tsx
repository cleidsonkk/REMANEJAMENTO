"use client";

import { useEffect } from "react";

import { reportClientError } from "@/lib/observability";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError("ui.dashboard_error", error, {
      digest: error.digest ?? null,
    });
  }, [error]);

  return (
    <div className="rounded-[2rem] border bg-white/92 p-8 shadow-panel">
      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Erro operacional</p>
      <h2 className="mt-4 text-3xl font-semibold">Não foi possível carregar esta área do painel.</h2>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
        Recarregue a seção para tentar novamente. Se o problema persistir, utilize o código de referência para auditoria técnica.
      </p>
      {error.digest ? (
        <p className="mt-4 rounded-2xl border bg-muted/40 px-4 py-3 text-sm">
          Código de referência: <strong>{error.digest}</strong>
        </p>
      ) : null}
      <button
        className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-medium text-primary-foreground"
        onClick={reset}
        type="button"
      >
        Recarregar área
      </button>
    </div>
  );
}

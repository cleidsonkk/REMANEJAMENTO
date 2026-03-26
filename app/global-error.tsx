"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen items-center justify-center bg-[linear-gradient(145deg,#f8f4ec_0%,#eef6f3_100%)] px-4">
        <div className="w-full max-w-2xl rounded-[2rem] border bg-white p-8 shadow-panel">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Falha global</p>
          <h1 className="mt-4 text-3xl font-semibold">O sistema encontrou um erro inesperado.</h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            A aplicação registrou a falha e bloqueou a continuação para preservar a integridade da sessão atual.
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
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}

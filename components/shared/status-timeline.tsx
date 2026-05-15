import { CheckCircle2, CircleDashed, Clock3, FilePlus2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { TimelineEvent } from "@/services/remanejamento.service";

type TimelineStatus = "PENDENTE" | "DEVOLVIDO_PARA_CORRECAO" | "REALIZADO" | "CANCELADO";

function formatTimelineDate(timestamp: Date | null) {
  if (!timestamp) {
    return "";
  }

  return timestamp.toLocaleString("pt-BR");
}

export function StatusTimeline({
  status,
  createdAtLabel,
  executedAtLabel,
  events,
}: {
  status?: TimelineStatus;
  createdAtLabel?: string;
  executedAtLabel?: string | null;
  events?: TimelineEvent[];
}) {
  const resolvedEvents =
    events ??
    [
      {
        id: "created",
        label: "Criada",
        detail: createdAtLabel ?? "",
        tone: "done" as const,
        timestamp: null,
      },
      {
        id: "analysis",
        label:
          status === "REALIZADO"
            ? "Executada"
            : status === "CANCELADO"
              ? "Encerrada"
              : status === "DEVOLVIDO_PARA_CORRECAO"
                ? "Devolvida para correcao"
                : "Em analise",
        detail:
          executedAtLabel ??
          (status === "PENDENTE"
            ? "Aguardando acao administrativa"
            : status === "DEVOLVIDO_PARA_CORRECAO"
              ? "Aguardando ajustes da secretaria"
              : "Sem data informada"),
        tone: status === "PENDENTE" ? ("current" as const) : ("done" as const),
        timestamp: null,
      },
      {
        id: "audit",
        label: "Auditada",
        detail:
          status === "REALIZADO"
            ? "Registro consolidado"
            : status === "DEVOLVIDO_PARA_CORRECAO"
              ? "Lote retornado e aguardando novo envio"
              : "Aguardando consolidacao",
        tone: status === "REALIZADO" ? ("done" as const) : status === "DEVOLVIDO_PARA_CORRECAO" ? ("done" as const) : ("pending" as const),
        timestamp: null,
      },
    ];

  return (
    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1">
      {resolvedEvents.map((step) => {
        const Icon = step.tone === "done" ? CheckCircle2 : step.tone === "current" ? Clock3 : step.id === "created" ? FilePlus2 : CircleDashed;

        return (
          <div
            key={step.id}
            className={cn(
              "rounded-2xl border p-4",
              step.tone === "done"
                ? "border-emerald-200 bg-emerald-50/60"
                : step.tone === "current"
                  ? "border-amber-200 bg-amber-50/70"
                  : "border-slate-200 bg-white",
            )}
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  step.tone === "done"
                    ? "bg-emerald-600 text-white"
                    : step.tone === "current"
                      ? "bg-amber-500 text-white"
                      : "bg-slate-100 text-slate-600",
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{step.label}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.detail}</p>
                {step.timestamp ? (
                  <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                    {formatTimelineDate(step.timestamp)}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

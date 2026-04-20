import { ClipboardCheck, Fingerprint, Shield } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { parsePageParam } from "@/lib/pagination";
import { requireRole } from "@/services/authorization.service";
import { listAuditLogsPage } from "@/services/audit-log.service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getAuditVariant(action: string): "neutral" | "success" | "warning" | "danger" {
  if (action.includes("FAILURE")) {
    return "danger";
  }

  if (["EXECUTE", "LOGIN_SUCCESS", "CREATE", "RESET_PASSWORD"].includes(action)) {
    return "success";
  }

  if (action === "LOGOUT") {
    return "neutral";
  }

  return "warning";
}

function summarizeAuditPayload(oldData: unknown, newData: unknown) {
  const source = newData ?? oldData;
  if (!source) {
    return "-";
  }

  if (typeof source === "string") {
    return source.length > 140 ? `${source.slice(0, 137)}...` : source;
  }

  try {
    const serialized = JSON.stringify(source);
    return serialized.length > 140 ? `${serialized.slice(0, 137)}...` : serialized;
  } catch {
    return "Dados disponíveis no registro";
  }
}

export default async function AuditoriaPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole("ADMIN_PLANEJAMENTO");

  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const action = typeof params.action === "string" ? params.action.trim() : "";
  const entity = typeof params.entity === "string" ? params.entity.trim() : "";
  const page = parsePageParam(typeof params.page === "string" ? params.page : undefined);
  const logsPage = await listAuditLogsPage({
    action,
    entity,
    page,
    pageSize: 20,
    search: q,
  });
  const logs = logsPage.items;

  const successEvents = logs.filter((item) => !item.action.includes("FAILURE")).length;
  const failureEvents = logs.filter((item) => item.action.includes("FAILURE")).length;
  const authEvents = logs.filter((item) => item.entity === "Auth").length;
  const responsibleUsers = new Set(logs.map((item) => item.userId).filter(Boolean)).size;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Governança"
        title="Auditoria institucional e rastreabilidade"
        description="Acompanhe eventos críticos do sistema com filtros objetivos, leitura administrativa clara e trilha de responsabilização por usuário, entidade e ação."
        aside={
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
              <p className="text-sm text-white/70">Eventos filtrados</p>
              <p className="mt-2 text-3xl font-semibold text-white">{logsPage.total}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
              <p className="text-sm text-white/70">Falhas na página</p>
              <p className="mt-2 text-3xl font-semibold text-white">{failureEvents}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
              <p className="text-sm text-white/70">Autenticação na página</p>
              <p className="mt-2 text-3xl font-semibold text-white">{authEvents}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
              <p className="text-sm text-white/70">Usuários na página</p>
              <p className="mt-2 text-3xl font-semibold text-white">{responsibleUsers}</p>
            </div>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.75rem] border bg-white/92 p-5 shadow-panel">
          <Shield className="h-5 w-5 text-primary" />
          <p className="mt-4 text-sm font-semibold text-slate-950">Rastreabilidade contínua</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Eventos sensíveis permanecem disponíveis para conferência administrativa e suporte operacional.
          </p>
        </div>
        <div className="rounded-[1.75rem] border bg-white/92 p-5 shadow-panel">
          <Fingerprint className="h-5 w-5 text-primary" />
          <p className="mt-4 text-sm font-semibold text-slate-950">Responsabilização objetiva</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Cada ação fica associada ao usuário ou ao processo técnico responsável pela alteração registrada.
          </p>
        </div>
        <div className="rounded-[1.75rem] border bg-white/92 p-5 shadow-panel">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          <p className="mt-4 text-sm font-semibold text-slate-950">Leitura executiva</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {successEvents} eventos operacionais concluídos no recorte atual, com filtros rápidos para inspeção.
          </p>
        </div>
      </section>

      <Card className="bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(246,244,239,0.94))]">
        <CardTitle>Auditoria</CardTitle>
        <CardDescription className="mt-2">
          Consulte logins, falhas de autenticação, criação de registros, redefinição de senha e execuções administrativas.
        </CardDescription>

        <form className="mt-6 grid gap-4 rounded-[1.5rem] border bg-muted/35 p-4 md:grid-cols-2 xl:grid-cols-[1.2fr,0.7fr,0.7fr,auto]">
          <div className="space-y-2">
            <Label htmlFor="q">Buscar por usuário, ação, entidade ou ID</Label>
            <Input defaultValue={q} id="q" name="q" placeholder="Digite um termo administrativo" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="action">Ação</Label>
            <Select
              defaultValue={action}
              id="action"
              name="action"
              options={[
                { value: "CREATE", label: "CREATE" },
                { value: "EXECUTE", label: "EXECUTE" },
                { value: "LOGIN_SUCCESS", label: "LOGIN_SUCCESS" },
                { value: "LOGIN_FAILURE", label: "LOGIN_FAILURE" },
                { value: "LOGOUT", label: "LOGOUT" },
                { value: "RESET_PASSWORD", label: "RESET_PASSWORD" },
              ]}
              placeholder="Todas"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="entity">Entidade</Label>
            <Select
              defaultValue={entity}
              id="entity"
              name="entity"
              options={[
                { value: "Auth", label: "Auth" },
                { value: "User", label: "User" },
                { value: "Secretaria", label: "Secretaria" },
                { value: "Remanejamento", label: "Remanejamento" },
              ]}
              placeholder="Todas"
            />
          </div>
          <div className="flex items-end gap-3">
            <Button className="w-full xl:w-auto" type="submit">
              Aplicar filtros
            </Button>
          </div>
        </form>

        {logs.length ? (
          <>
            <div className="mt-6 grid gap-4 xl:hidden">
              {logs.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[1.5rem] border border-white/10 bg-white/95 px-5 py-4 text-slate-900 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-950">{item.user?.nome ?? "Sistema"}</p>
                      <p className="mt-1 text-sm text-slate-600">{item.timestamp.toLocaleString("pt-BR")}</p>
                    </div>
                    <Badge className="shrink-0" variant={getAuditVariant(item.action)}>
                      {item.action}
                    </Badge>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Entidade</p>
                      <p className="mt-2 text-sm font-medium text-slate-900">{item.entity}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">ID relacionado</p>
                      <p className="mt-2 break-words text-sm font-medium text-slate-900">{item.entityId ?? "-"}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Resumo</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {summarizeAuditPayload(item.oldData, item.newData)}
                    </p>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-6 hidden overflow-x-auto rounded-[1.5rem] border bg-white xl:block">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/55">
                  <tr>
                    <th className="px-5 py-4 text-left font-semibold">Data</th>
                    <th className="px-5 py-4 text-left font-semibold">Usuário</th>
                    <th className="px-5 py-4 text-left font-semibold">Ação</th>
                    <th className="px-5 py-4 text-left font-semibold">Entidade</th>
                    <th className="px-5 py-4 text-left font-semibold">ID</th>
                    <th className="px-5 py-4 text-left font-semibold">Resumo</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((item) => (
                    <tr key={item.id} className="border-t border-slate-200/80 align-top">
                      <td className="whitespace-nowrap px-5 py-4">{item.timestamp.toLocaleString("pt-BR")}</td>
                      <td className="px-5 py-4">{item.user?.nome ?? "Sistema"}</td>
                      <td className="px-5 py-4">
                        <Badge variant={getAuditVariant(item.action)}>{item.action}</Badge>
                      </td>
                      <td className="px-5 py-4">{item.entity}</td>
                      <td className="px-5 py-4">
                        <div className="max-w-[180px] break-words text-slate-700">{item.entityId ?? "-"}</div>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        <div className="max-w-[360px] leading-6">{summarizeAuditPayload(item.oldData, item.newData)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6">
              <PaginationControls
                page={logsPage.page}
                pageSize={logsPage.pageSize}
                pathname="/dashboard/auditoria"
                query={{
                  action: action || undefined,
                  entity: entity || undefined,
                  q: q || undefined,
                }}
                total={logsPage.total}
                totalPages={logsPage.totalPages}
              />
            </div>
          </>
        ) : (
          <div className="mt-6">
            <EmptyState
              title="Nenhum evento encontrado"
              description="Ajuste os filtros para localizar ações específicas de autenticação, administração ou execução orçamentária."
            />
          </div>
        )}
      </Card>
    </div>
  );
}

import { ClipboardCheck, Fingerprint, Shield } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/services/authorization.service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getAuditVariant(action: string): "neutral" | "success" | "warning" | "danger" {
  if (action.includes("FAILURE")) {
    return "danger";
  }

  if (["EXECUTE", "LOGIN_SUCCESS", "CREATE", "RESET_PASSWORD"].includes(action)) {
    return "success";
  }

  if (["LOGOUT"].includes(action)) {
    return "neutral";
  }

  return "warning";
}

export default async function AuditoriaPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole("ADMIN_PLANEJAMENTO");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const action = typeof params.action === "string" ? params.action.trim() : "";
  const entity = typeof params.entity === "string" ? params.entity.trim() : "";

  const logs = await prisma.auditLog.findMany({
    include: { user: true },
    where: {
      action: action || undefined,
      entity: entity || undefined,
      OR: q
        ? [
            { action: { contains: q, mode: "insensitive" } },
            { entity: { contains: q, mode: "insensitive" } },
            { entityId: { contains: q, mode: "insensitive" } },
            { user: { is: { nome: { contains: q, mode: "insensitive" } } } },
          ]
        : undefined,
    },
    orderBy: { timestamp: "desc" },
    take: 80,
  });

  const successEvents = logs.filter((item) => !item.action.includes("FAILURE")).length;
  const failureEvents = logs.filter((item) => item.action.includes("FAILURE")).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Governança"
        title="Auditoria institucional e rastreabilidade"
        description="Acompanhe os eventos críticos do sistema, com filtros por ação, entidade e termo livre para acelerar conferências administrativas."
        aside={
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
              <p className="text-sm text-white/70">Eventos filtrados</p>
              <p className="mt-2 text-3xl font-semibold">{logs.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
              <p className="text-sm text-white/70">Falhas registradas</p>
              <p className="mt-2 text-3xl font-semibold">{failureEvents}</p>
            </div>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.75rem] border bg-white/92 p-5 shadow-panel">
          <Shield className="h-5 w-5 text-primary" />
          <p className="mt-4 text-sm font-semibold">Rastreabilidade</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Eventos relevantes registrados para consulta administrativa.</p>
        </div>
        <div className="rounded-[1.75rem] border bg-white/92 p-5 shadow-panel">
          <Fingerprint className="h-5 w-5 text-primary" />
          <p className="mt-4 text-sm font-semibold">Responsabilização</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Cada ação fica associada ao usuário ou ao processo técnico responsável.</p>
        </div>
        <div className="rounded-[1.75rem] border bg-white/92 p-5 shadow-panel">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          <p className="mt-4 text-sm font-semibold">Conferência institucional</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{successEvents} eventos operacionais concluídos no recorte atual.</p>
        </div>
      </section>

      <Card className="bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(246,244,239,0.94))]">
        <CardTitle>Auditoria</CardTitle>
        <CardDescription className="mt-2">
          Consulte logins, falhas de autenticação, criação de registros, redefinição de senha e execuções administrativas.
        </CardDescription>

        <form className="mt-6 grid gap-4 rounded-[1.5rem] border bg-muted/35 p-4 md:grid-cols-2 xl:grid-cols-[1.2fr,0.7fr,0.7fr,auto]">
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="q">
              Buscar por usuário, ação, entidade ou ID
            </label>
            <input
              className="h-11 w-full rounded-xl border bg-white px-3 text-sm"
              defaultValue={q}
              id="q"
              name="q"
              placeholder="Digite um termo administrativo"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="action">
              Ação
            </label>
            <select className="h-11 w-full rounded-xl border bg-white px-3 text-sm" defaultValue={action} id="action" name="action">
              <option value="">Todas</option>
              <option value="CREATE">CREATE</option>
              <option value="EXECUTE">EXECUTE</option>
              <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
              <option value="LOGIN_FAILURE">LOGIN_FAILURE</option>
              <option value="LOGOUT">LOGOUT</option>
              <option value="RESET_PASSWORD">RESET_PASSWORD</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="entity">
              Entidade
            </label>
            <select className="h-11 w-full rounded-xl border bg-white px-3 text-sm" defaultValue={entity} id="entity" name="entity">
              <option value="">Todas</option>
              <option value="Auth">Auth</option>
              <option value="User">User</option>
              <option value="Secretaria">Secretaria</option>
              <option value="Remanejamento">Remanejamento</option>
            </select>
          </div>
          <div className="flex items-end gap-3">
            <button className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground" type="submit">
              Aplicar
            </button>
          </div>
        </form>

        {logs.length ? (
          <div className="mt-6 overflow-x-auto rounded-[1.5rem] border bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/55">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Data</th>
                  <th className="px-4 py-3 text-left font-semibold">Usuário</th>
                  <th className="px-4 py-3 text-left font-semibold">Ação</th>
                  <th className="px-4 py-3 text-left font-semibold">Entidade</th>
                  <th className="px-4 py-3 text-left font-semibold">ID</th>
                  <th className="px-4 py-3 text-left font-semibold">Resumo</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((item) => (
                  <tr key={item.id} className="border-t align-top">
                    <td className="px-4 py-3">{item.timestamp.toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-3">{item.user?.nome ?? "Sistema"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={getAuditVariant(item.action)}>{item.action}</Badge>
                    </td>
                    <td className="px-4 py-3">{item.entity}</td>
                    <td className="px-4 py-3">{item.entityId ?? "-"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {item.newData ? JSON.stringify(item.newData).slice(0, 120) : item.oldData ? JSON.stringify(item.oldData).slice(0, 120) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

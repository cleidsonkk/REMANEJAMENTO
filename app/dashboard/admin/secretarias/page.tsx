import Link from "next/link";
import { Building2, FileSpreadsheet, Landmark, SquarePen, Users } from "lucide-react";

import {
  createSecretariaAction,
  toggleSecretariaStatusAction,
  updateSecretariaAction,
} from "@/app/actions/admin-actions";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SimpleFormCard } from "@/features/admin/simple-form-card";
import { formatGovernmentCode, formatSequentialCode } from "@/lib/utils";
import { requireRole } from "@/services/authorization.service";
import { listSecretarias } from "@/services/secretaria.service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SecretariasPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole("ADMIN_PLANEJAMENTO");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const edit = typeof params.edit === "string" ? params.edit : "";
  const success = typeof params.success === "string" ? params.success : "";
  const error = typeof params.error === "string" ? params.error : "";
  const secretarias = await listSecretarias(false, q);
  const editingSecretaria = secretarias.find((item) => item.id === edit) ?? null;
  const secretariaFormAction = editingSecretaria
    ? updateSecretariaAction.bind(null, editingSecretaria.id)
    : createSecretariaAction;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administração"
        title="Gestão institucional das secretarias"
        description="Cadastre, edite e inative secretarias, acompanhe a base importada da planilha oficial e monitore usuários e catálogo orçamentário associados a cada órgão."
        aside={
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
              <p className="text-sm text-white/70">Secretarias</p>
              <p className="mt-2 text-3xl font-semibold text-white">{secretarias.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
              <p className="text-sm text-white/70">Base ativa</p>
              <p className="mt-2 text-base font-semibold text-white">Catálogo institucional integrado</p>
            </div>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.75rem] border bg-white/92 p-5 shadow-panel">
          <Building2 className="h-5 w-5 text-primary" />
          <p className="mt-4 text-sm font-semibold">Cadastro centralizado</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Controle administrativo unificado por órgão.</p>
        </div>
        <div className="rounded-[1.75rem] border bg-white/92 p-5 shadow-panel">
          <Users className="h-5 w-5 text-primary" />
          <p className="mt-4 text-sm font-semibold">Múltiplos usuários por secretaria</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Estrutura preparada para operação simultânea.</p>
        </div>
        <div className="rounded-[1.75rem] border bg-white/92 p-5 shadow-panel">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          <p className="mt-4 text-sm font-semibold">Catálogo orçamentário</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Itens importados e vinculados por unidade orçamentária.</p>
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,430px),minmax(0,1fr)]">
        <SimpleFormCard
          className="min-w-0 self-start"
          title={editingSecretaria ? "Editar secretaria" : "Nova secretaria"}
          description="Cadastro institucional com código interno sequencial gerado automaticamente. A mesma secretaria pode receber vários usuários ativos e manter catálogo orçamentário próprio."
        >
          <form action={secretariaFormAction} className="space-y-4">
            {success ? (
              <div className="rounded-2xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-3 text-sm leading-6 text-emerald-100">
                {success}
              </div>
            ) : null}
            <FormError message={error} />

            <div>
              <Label className="text-white" htmlFor="nomeSecretaria">
                Nome da secretaria
              </Label>
              <Input defaultValue={editingSecretaria?.nomeSecretaria ?? ""} id="nomeSecretaria" name="nomeSecretaria" required />
            </div>

            <div>
              <Label className="text-white" htmlFor="sigla">
                Sigla
              </Label>
              <Input defaultValue={editingSecretaria?.sigla ?? ""} id="sigla" name="sigla" />
            </div>

            <div>
              <Label className="text-white" htmlFor="unidadeOrcamentaria">
                Unidade orçamentária
              </Label>
              <Input
                defaultValue={editingSecretaria?.unidadeOrcamentaria ?? ""}
                id="unidadeOrcamentaria"
                name="unidadeOrcamentaria"
                required
              />
              <p className="mt-2 text-xs leading-5 text-slate-300">
                Informe o código institucional da secretaria. O código interno sequencial é gerado automaticamente pelo
                sistema.
              </p>
            </div>

            <div>
              <Label className="text-white" htmlFor="nomeSecretario">
                Nome do secretário
              </Label>
              <Input defaultValue={editingSecretaria?.nomeSecretario ?? ""} id="nomeSecretario" name="nomeSecretario" required />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="flex items-center gap-3">
                <input defaultChecked={editingSecretaria ? editingSecretaria.statusAtivo : true} id="statusAtivo" name="statusAtivo" type="checkbox" />
                <Label className="mb-0 text-white" htmlFor="statusAtivo">
                  Manter secretaria ativa para novos vínculos
                </Label>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button className="w-full sm:w-auto" type="submit">
                {editingSecretaria ? "Salvar alterações" : "Cadastrar secretaria"}
              </Button>
              {editingSecretaria ? (
                <Link href="/dashboard/admin/secretarias">
                  <Button type="button" variant="outline">
                    Cancelar edição
                  </Button>
                </Link>
              ) : null}
            </div>
          </form>
        </SimpleFormCard>

        <SimpleFormCard
          className="min-w-0 self-start"
          title="Secretarias importadas"
          description="Base institucional carregada da planilha oficial com catálogo orçamentário vinculado por unidade e ações administrativas completas."
          tone="light"
        >
          <form className="mb-4 grid gap-3 md:grid-cols-[minmax(0,1fr),auto]">
            <Input defaultValue={q} name="q" placeholder="Buscar por secretaria, secretário ou unidade" />
            <Button type="submit" variant="outline">
              Buscar
            </Button>
          </form>

          {secretarias.length ? (
            <div className="table-safe">
              <table className="min-w-[1040px] text-sm text-slate-900">
                <thead className="bg-[linear-gradient(180deg,#f8fafc,#eef2f7)] text-slate-900">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Código</th>
                    <th className="px-4 py-3 text-left font-semibold">Secretaria</th>
                    <th className="px-4 py-3 text-left font-semibold">Secretário</th>
                    <th className="px-4 py-3 text-left font-semibold">Usuários</th>
                    <th className="px-4 py-3 text-left font-semibold">Catálogo</th>
                    <th className="px-4 py-3 text-left font-semibold">Unidade</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {secretarias.map((item) => (
                    <tr key={item.id} className="border-t border-slate-200/80 align-top text-slate-800">
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-950">
                        {formatSequentialCode(item.codigo)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-[320px] leading-6 text-slate-900">
                          <span className="line-clamp-2">{item.nomeSecretaria}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-[220px] leading-6 text-slate-700">
                          <span className="line-clamp-2">{item.nomeSecretario}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">{item._count.userLinks}</td>
                      <td className="whitespace-nowrap px-4 py-3">{item._count.catalogItems}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-900">
                        {formatGovernmentCode(item.unidadeOrcamentaria)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            item.statusAtivo ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {item.statusAtivo ? "Ativa" : "Inativa"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/dashboard/admin/secretarias?edit=${item.id}`}>
                            <Button size="sm" type="button" variant="outline">
                              <SquarePen className="mr-2 h-4 w-4" />
                              Editar
                            </Button>
                          </Link>
                          <form action={toggleSecretariaStatusAction.bind(null, item.id)}>
                            <Button size="sm" type="submit" variant="outline">
                              {item.statusAtivo ? "Inativar" : "Reativar"}
                            </Button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              description="Refine a busca ou revise o cadastro institucional importado da planilha oficial."
              title="Nenhuma secretaria encontrada"
            />
          )}

          <div className="mt-5 rounded-[1.5rem] border bg-muted/35 p-4">
            <div className="flex items-start gap-3">
              <Landmark className="mt-1 h-5 w-5 text-primary" />
              <p className="text-sm leading-6 text-muted-foreground">
                A base exibida acima alimenta o catálogo utilizado nos formulários de remanejamento por unidade
                orçamentária.
              </p>
            </div>
          </div>
        </SimpleFormCard>
      </div>
    </div>
  );
}

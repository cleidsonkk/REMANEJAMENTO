import Link from "next/link";
import { Building2, FileSpreadsheet, Landmark, SquarePen, Users } from "lucide-react";

import {
  createSecretariaAction,
  toggleSecretariaStatusAction,
  updateSecretariaAction,
} from "@/app/actions/admin-actions";
import { EmptyState } from "@/components/shared/empty-state";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { PageHeader } from "@/components/shared/page-header";
import { SectionNote } from "@/components/shared/section-note";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SimpleFormCard } from "@/features/admin/simple-form-card";
import { parsePageParam } from "@/lib/pagination";
import { formatGovernmentCode, formatSequentialCode } from "@/lib/utils";
import { requireRole } from "@/services/authorization.service";
import { getSecretariaById, listSecretarias, listSecretariasPage } from "@/services/secretaria.service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SecretariasPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole("ADMIN_PLANEJAMENTO");

  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const page = parsePageParam(typeof params.page === "string" ? params.page : undefined);
  const edit = typeof params.edit === "string" ? params.edit : "";
  const success = typeof params.success === "string" ? params.success : "";
  const error = typeof params.error === "string" ? params.error : "";

  const [secretariasPage, secretariasSummary, editingSecretaria] = await Promise.all([
    listSecretariasPage({ search: q, page, pageSize: 10 }),
    listSecretarias(false, q),
    edit ? getSecretariaById(edit) : Promise.resolve(null),
  ]);
  const secretarias = secretariasPage.items;
  const secretariaFormAction = editingSecretaria
    ? updateSecretariaAction.bind(null, editingSecretaria.id)
    : createSecretariaAction;
  const buildSecretariasHref = (extra: Record<string, string | undefined> = {}) => {
    const search = new URLSearchParams();

    if (q) {
      search.set("q", q);
    }

    if (secretariasPage.page > 1) {
      search.set("page", String(secretariasPage.page));
    }

    for (const [key, value] of Object.entries(extra)) {
      if (!value) {
        search.delete(key);
        continue;
      }

      search.set(key, value);
    }

    const query = search.toString();
    return query ? `/dashboard/admin/secretarias?${query}` : "/dashboard/admin/secretarias";
  };

  const activeSecretarias = secretariasSummary.filter((item) => item.statusAtivo).length;
  const inactiveSecretarias = secretariasSummary.length - activeSecretarias;
  const linkedUsers = secretariasSummary.reduce((sum, item) => sum + item._count.userLinks, 0);
  const catalogItems = secretariasSummary.reduce((sum, item) => sum + item._count.catalogItems, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administração"
        title="Gestão institucional das secretarias"
        description="Cadastre, atualize e acompanhe a base oficial das secretarias com leitura clara de vínculos, catálogo orçamentário e status operacional."
        aside={
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
              <p className="text-sm text-white/70">Secretarias ativas</p>
              <p className="mt-2 text-3xl font-semibold text-white">{activeSecretarias}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
              <p className="text-sm text-white/70">Secretarias inativas</p>
              <p className="mt-2 text-3xl font-semibold text-white">{inactiveSecretarias}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
              <p className="text-sm text-white/70">Vínculos de usuários</p>
              <p className="mt-2 text-3xl font-semibold text-white">{linkedUsers}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
              <p className="text-sm text-white/70">Itens de catálogo</p>
              <p className="mt-2 text-3xl font-semibold text-white">{catalogItems}</p>
            </div>
          </div>
        }
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-[1.75rem] border bg-white/92 p-5 shadow-panel">
          <Building2 className="h-5 w-5 text-primary" />
          <p className="mt-4 text-sm font-semibold text-slate-950">Base institucional única</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            O cadastro centraliza órgão, unidade orçamentária e secretário responsável em um só fluxo.
          </p>
        </div>
        <div className="rounded-[1.75rem] border bg-white/92 p-5 shadow-panel">
          <Users className="h-5 w-5 text-primary" />
          <p className="mt-4 text-sm font-semibold text-slate-950">Vínculos organizados</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Cada secretaria pode sustentar múltiplos acessos sem duplicidade institucional.
          </p>
        </div>
        <div className="rounded-[1.75rem] border bg-white/92 p-5 shadow-panel">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          <p className="mt-4 text-sm font-semibold text-slate-950">Catálogo por unidade</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            O sistema preserva a leitura orçamentária de cada órgão com base importada oficialmente.
          </p>
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,430px),minmax(0,1fr)]">
        <SimpleFormCard
          className="min-w-0 self-start"
          title={editingSecretaria ? "Editar secretaria" : "Nova secretaria"}
          description="Cadastro institucional com código interno sequencial gerado automaticamente e leitura preparada para operação administrativa diária."
        >
          <form action={secretariaFormAction} className="space-y-4">
            <input name="contextQ" type="hidden" value={q} />
            <input name="contextPage" type="hidden" value={String(secretariasPage.page)} />
            {success ? (
              <div className="rounded-2xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-3 text-sm leading-6 text-emerald-100">
                {success}
              </div>
            ) : null}
            <FormError message={error} />

            <div className="space-y-2">
              <Label className="text-white" htmlFor="nomeSecretaria">
                Nome da secretaria
              </Label>
              <Input defaultValue={editingSecretaria?.nomeSecretaria ?? ""} id="nomeSecretaria" name="nomeSecretaria" required />
            </div>

            <div className="space-y-2">
              <Label className="text-white" htmlFor="sigla">
                Sigla
              </Label>
              <Input defaultValue={editingSecretaria?.sigla ?? ""} id="sigla" name="sigla" />
            </div>

            <div className="space-y-2">
              <Label className="text-white" htmlFor="unidadeOrcamentaria">
                Unidade orçamentária
              </Label>
              <Input
                defaultValue={editingSecretaria?.unidadeOrcamentaria ?? ""}
                id="unidadeOrcamentaria"
                name="unidadeOrcamentaria"
                required
              />
              <p className="text-xs leading-5 text-slate-300">
                Informe o código institucional oficial. O código interno sequencial é gerado automaticamente pelo sistema.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-white" htmlFor="nomeSecretario">
                Nome do secretário
              </Label>
              <Input defaultValue={editingSecretaria?.nomeSecretario ?? ""} id="nomeSecretario" name="nomeSecretario" required />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <label className="flex items-center gap-3 text-sm text-white" htmlFor="statusAtivo">
                <input defaultChecked={editingSecretaria ? editingSecretaria.statusAtivo : true} id="statusAtivo" name="statusAtivo" type="checkbox" />
                Manter secretaria ativa para novos vínculos
              </label>
            </div>

            <SectionNote>
              Use a inativação apenas quando o órgão não puder mais receber novos lançamentos. Os registros históricos e os vínculos existentes permanecem auditáveis.
            </SectionNote>

            <div className="flex flex-wrap gap-3">
              <Button className="w-full sm:w-auto" type="submit">
                {editingSecretaria ? "Salvar alterações" : "Cadastrar secretaria"}
              </Button>
              {editingSecretaria ? (
                <Link href={buildSecretariasHref({ edit: undefined })}>
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
          description="Base institucional carregada da planilha oficial com indicadores de uso, status e catálogo vinculado."
          tone="light"
        >
          <div className="space-y-5">
            <form className="grid gap-3 md:grid-cols-[minmax(0,1fr),132px]">
              <Input defaultValue={q} name="q" placeholder="Buscar por secretaria, secretário ou unidade" />
              <Button className="w-full" type="submit" variant="outline">
                Buscar
              </Button>
            </form>

            {secretarias.length ? (
              <>
                <div className="grid gap-4 xl:hidden">
                  {secretarias.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-[1.5rem] border border-white/10 bg-white/95 px-5 py-4 text-slate-900 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                            Código {formatSequentialCode(item.codigo)}
                          </p>
                          <p className="mt-2 text-base font-semibold text-slate-950">{item.nomeSecretaria}</p>
                          <p className="mt-1 text-sm text-slate-600">{item.nomeSecretario}</p>
                        </div>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            item.statusAtivo ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {item.statusAtivo ? "Ativa" : "Inativa"}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
                          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Unidade</p>
                          <p className="mt-2 text-sm font-medium text-slate-900">
                            {formatGovernmentCode(item.unidadeOrcamentaria)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
                          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Usuários</p>
                          <p className="mt-2 text-sm font-medium text-slate-900">{item._count.userLinks}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3">
                          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Catálogo</p>
                          <p className="mt-2 text-sm font-medium text-slate-900">{item._count.catalogItems}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link href={buildSecretariasHref({ edit: item.id })}>
                          <Button size="sm" type="button" variant="outline">
                            <SquarePen className="mr-2 h-4 w-4" />
                            Editar
                          </Button>
                        </Link>
                        <form action={toggleSecretariaStatusAction.bind(null, item.id)}>
                          <input name="contextQ" type="hidden" value={q} />
                          <input name="contextPage" type="hidden" value={String(secretariasPage.page)} />
                          <Button size="sm" type="submit" variant="outline">
                            {item.statusAtivo ? "Inativar" : "Reativar"}
                          </Button>
                        </form>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="hidden overflow-x-auto rounded-[1.5rem] border border-white/10 bg-white/95 xl:block">
                  <table className="min-w-[1080px] w-full text-sm text-slate-900">
                    <thead className="bg-[linear-gradient(180deg,rgba(241,245,249,0.98),rgba(226,232,240,0.98))]">
                      <tr>
                        <th className="px-5 py-4 text-left font-semibold">Código</th>
                        <th className="px-5 py-4 text-left font-semibold">Secretaria</th>
                        <th className="px-5 py-4 text-left font-semibold">Secretário</th>
                        <th className="px-5 py-4 text-left font-semibold">Usuários</th>
                        <th className="px-5 py-4 text-left font-semibold">Catálogo</th>
                        <th className="px-5 py-4 text-left font-semibold">Unidade</th>
                        <th className="px-5 py-4 text-left font-semibold">Status</th>
                        <th className="px-5 py-4 text-left font-semibold">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {secretarias.map((item) => (
                        <tr key={item.id} className="border-t border-slate-200/80 align-top">
                          <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-950">
                            {formatSequentialCode(item.codigo)}
                          </td>
                          <td className="px-5 py-4">
                            <div className="max-w-[320px] leading-6 text-slate-900">
                              <span className="line-clamp-2">{item.nomeSecretaria}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="max-w-[240px] leading-6 text-slate-700">
                              <span className="line-clamp-2">{item.nomeSecretario}</span>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-5 py-4">{item._count.userLinks}</td>
                          <td className="whitespace-nowrap px-5 py-4">{item._count.catalogItems}</td>
                          <td className="whitespace-nowrap px-5 py-4 text-slate-900">
                            {formatGovernmentCode(item.unidadeOrcamentaria)}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                item.statusAtivo ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {item.statusAtivo ? "Ativa" : "Inativa"}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-2">
                              <Link href={buildSecretariasHref({ edit: item.id })}>
                                <Button size="sm" type="button" variant="outline">
                                  <SquarePen className="mr-2 h-4 w-4" />
                                  Editar
                                </Button>
                              </Link>
                              <form action={toggleSecretariaStatusAction.bind(null, item.id)}>
                                <input name="contextQ" type="hidden" value={q} />
                                <input name="contextPage" type="hidden" value={String(secretariasPage.page)} />
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

                <PaginationControls
                  page={secretariasPage.page}
                  pageSize={secretariasPage.pageSize}
                  pathname="/dashboard/admin/secretarias"
                  query={{ q: q || undefined }}
                  total={secretariasPage.total}
                  totalPages={secretariasPage.totalPages}
                />
              </>
            ) : (
              <EmptyState
                description="Refine a busca ou revise o cadastro institucional importado da planilha oficial."
                title="Nenhuma secretaria encontrada"
              />
            )}

            <div className="rounded-[1.5rem] border bg-muted/35 p-4">
              <div className="flex items-start gap-3">
                <Landmark className="mt-1 h-5 w-5 text-primary" />
                <p className="text-sm leading-6 text-muted-foreground">
                  A base exibida acima alimenta o catálogo utilizado nos formulários de remanejamento por unidade orçamentária e preserva a leitura institucional do órgão responsável.
                </p>
              </div>
            </div>
          </div>
        </SimpleFormCard>
      </div>
    </div>
  );
}

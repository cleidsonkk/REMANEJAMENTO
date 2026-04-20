import Link from "next/link";
import { ShieldCheck, SquarePen, UserCog, Users } from "lucide-react";
import { UserRole, UserStatus } from "@prisma/client";

import {
  createUserAction,
  resetUserPasswordAction,
  toggleUserStatusAction,
  updateUserAction,
} from "@/app/actions/admin-actions";
import { EmptyState } from "@/components/shared/empty-state";
import { PaginationControls } from "@/components/shared/pagination-controls";
import { PageHeader } from "@/components/shared/page-header";
import { SectionNote } from "@/components/shared/section-note";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { SimpleFormCard } from "@/features/admin/simple-form-card";
import { parsePageParam } from "@/lib/pagination";
import { formatCpf, formatGovernmentCode, getPasswordPolicyMessage } from "@/lib/utils";
import { requireRole } from "@/services/authorization.service";
import { listActiveSecretariaOptions } from "@/services/secretaria.service";
import { getUserById, listUsersForSelect, listUsersPage } from "@/services/user.service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type LinkedSecretaria = {
  secretariaId: string;
  secretaria: {
    nomeSecretaria: string;
  };
};

function renderLinkedSecretarias(links: LinkedSecretaria[], previewCount = 3) {
  if (!links.length) {
    return <span className="text-sm text-slate-500">Sem secretaria vinculada</span>;
  }

  const preview = links.slice(0, previewCount);
  const remaining = links.slice(previewCount);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {preview.map((link) => (
          <span
            key={link.secretariaId}
            className="inline-flex rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs text-slate-700"
          >
            {link.secretaria.nomeSecretaria}
          </span>
        ))}
      </div>

      {remaining.length ? (
        <details className="group">
          <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            <span className="group-open:hidden">Ver mais {remaining.length}</span>
            <span className="hidden group-open:inline">Ver menos</span>
          </summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {remaining.map((link) => (
              <span
                key={link.secretariaId}
                className="inline-flex rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs text-slate-700"
              >
                {link.secretaria.nomeSecretaria}
              </span>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

export default async function UsuariosPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole("ADMIN_PLANEJAMENTO");

  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const page = parsePageParam(typeof params.page === "string" ? params.page : undefined);
  const edit = typeof params.edit === "string" ? params.edit : "";
  const userError = typeof params.userError === "string" ? params.userError : "";
  const userSuccess = typeof params.userSuccess === "string" ? params.userSuccess : "";
  const resetError = typeof params.resetError === "string" ? params.resetError : "";
  const resetSuccess = typeof params.resetSuccess === "string" ? params.resetSuccess : "";
  const [usersPage, secretarias, resetUserOptions, editingUser] = await Promise.all([
    listUsersPage({ search: q, page, pageSize: 10 }),
    listActiveSecretariaOptions(),
    listUsersForSelect(),
    edit ? getUserById(edit) : Promise.resolve(null),
  ]);

  const users = usersPage.items;
  const userFormAction = editingUser ? updateUserAction.bind(null, editingUser.id) : createUserAction;
  const linkedSecretariaIds = new Set(editingUser?.secretariasVinculadas.map((item) => item.secretariaId) ?? []);
  const buildUsuariosHref = (extra: Record<string, string | undefined> = {}) => {
    const search = new URLSearchParams();

    if (q) {
      search.set("q", q);
    }

    if (usersPage.page > 1) {
      search.set("page", String(usersPage.page));
    }

    for (const [key, value] of Object.entries(extra)) {
      if (!value) {
        search.delete(key);
        continue;
      }

      search.set(key, value);
    }

    const query = search.toString();
    return query ? `/dashboard/admin/usuarios?${query}` : "/dashboard/admin/usuarios";
  };

  const roleLabel: Record<UserRole, string> = {
    ADMIN_PLANEJAMENTO: "Administrador",
    USUARIO_SECRETARIA: "Usuário de secretaria",
  };

  const statusVariant: Record<UserStatus, "success" | "warning"> = {
    ATIVO: "success",
    INATIVO: "warning",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administração"
        title="Gestão de usuários e perfis de acesso"
        description="Cadastre, edite, redefina credenciais e inative acessos com leitura institucional, rastreabilidade e consistência operacional para uso diário do Planejamento."
        aside={
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
              <p className="text-sm text-white/70">Usuários cadastrados</p>
              <p className="mt-2 text-3xl font-semibold text-white">{usersPage.total}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
              <p className="text-sm text-white/70">Secretarias ativas</p>
              <p className="mt-2 text-3xl font-semibold text-white">{secretarias.length}</p>
            </div>
          </div>
        }
      />

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-[1.75rem] border bg-white/92 p-5 shadow-panel">
          <Users className="h-5 w-5 text-primary" />
          <p className="mt-4 text-sm font-semibold text-slate-950">Acesso distribuído</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Um mesmo operador pode atuar em uma ou mais secretarias autorizadas, sem duplicidade de cadastro.
          </p>
        </div>
        <div className="rounded-[1.75rem] border bg-white/92 p-5 shadow-panel">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <p className="mt-4 text-sm font-semibold text-slate-950">Controle por perfil</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Planejamento administra o sistema e usuários setoriais escolhem a secretaria operacional no momento da solicitação.
          </p>
        </div>
        <div className="rounded-[1.75rem] border bg-white/92 p-5 shadow-panel">
          <UserCog className="h-5 w-5 text-primary" />
          <p className="mt-4 text-sm font-semibold text-slate-950">Recuperação segura</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Redefinição de senha e inativação com trilha de auditoria e regra de permanência de administrador ativo.
          </p>
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,520px),minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <SimpleFormCard
            className="min-w-0 self-start"
            description="Usuários de secretaria podem operar uma ou mais secretarias ativas. A secretaria padrão serve como referência institucional; a escolha operacional final acontece dentro da solicitação."
            title={editingUser ? "Editar usuário" : "Novo usuário"}
          >
            <form action={userFormAction} className="space-y-5" noValidate>
              <input name="contextQ" type="hidden" value={q} />
              <input name="contextPage" type="hidden" value={String(usersPage.page)} />
              {userSuccess ? (
                <div className="rounded-2xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-3 text-sm leading-6 text-emerald-100">
                  {userSuccess}
                </div>
              ) : null}
              <FormError message={userError} />

              <div className="space-y-2">
                <Label className="text-white" htmlFor="nome">
                  Nome completo
                </Label>
                <Input defaultValue={editingUser?.nome ?? ""} id="nome" name="nome" required />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-white" htmlFor="cpf">
                    CPF
                  </Label>
                  <Input defaultValue={editingUser?.cpf ?? ""} id="cpf" name="cpf" required />
                </div>
                  <div className="space-y-2">
                    <Label className="text-white" htmlFor="email">
                      E-mail institucional
                    </Label>
                    <Input
                      autoCapitalize="none"
                      autoComplete="email"
                      defaultValue={editingUser?.email ?? ""}
                      id="email"
                      inputMode="email"
                      name="email"
                      placeholder="usuario@prefeitura.gov.br"
                      required
                      type="text"
                    />
                    <p className="text-xs leading-5 text-slate-300">
                      O cadastro envia o e-mail para validação no servidor, evitando travas do navegador no envio do formulário.
                    </p>
                  </div>
                </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-white" htmlFor="telefone">
                    Telefone
                  </Label>
                  <Input defaultValue={editingUser?.telefone ?? ""} id="telefone" name="telefone" />
                </div>
                {!editingUser ? (
                  <div className="space-y-2">
                    <Label className="text-white" htmlFor="password">
                      Senha inicial
                    </Label>
                    <Input id="password" name="password" required type="password" />
                  </div>
                ) : null}
              </div>

              {!editingUser ? <p className="-mt-2 text-xs leading-5 text-slate-300">{getPasswordPolicyMessage()}</p> : null}

              <SectionNote>
                Administradores do Planejamento podem ser cadastrados sem secretaria vinculada. Para criar mais de um
                administrador, use sempre CPF e e-mail exclusivos para cada acesso institucional.
              </SectionNote>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-white" htmlFor="role">
                    Perfil
                  </Label>
                  <Select
                    defaultValue={editingUser?.role ?? UserRole.USUARIO_SECRETARIA}
                    id="role"
                    name="role"
                    options={[
                      { value: UserRole.USUARIO_SECRETARIA, label: "Usuário de secretaria" },
                      { value: UserRole.ADMIN_PLANEJAMENTO, label: "Administrador" },
                    ]}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white" htmlFor="status">
                    Status
                  </Label>
                  <Select
                    defaultValue={editingUser?.status ?? UserStatus.ATIVO}
                    id="status"
                    name="status"
                    options={[
                      { value: UserStatus.ATIVO, label: "Ativo" },
                      { value: UserStatus.INATIVO, label: "Inativo" },
                    ]}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white" htmlFor="secretariaId">
                  Secretaria padrão de referência
                </Label>
                <Select
                  defaultValue={editingUser?.secretariaId ?? ""}
                  id="secretariaId"
                  name="secretariaId"
                  options={secretarias.map((item) => ({
                    value: item.id,
                    label: `${item.nomeSecretaria} • ${formatGovernmentCode(item.unidadeOrcamentaria)}`,
                  }))}
                  placeholder="Selecione a secretaria padrão"
                />
                <p className="text-xs leading-5 text-slate-300">
                  A secretaria padrão serve como referência institucional. O usuário poderá escolher entre as autorizadas na hora da solicitação.
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-white">Secretarias autorizadas</Label>
                <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
                  <div className="grid gap-3">
                    {secretarias.slice(0, 4).map((item) => (
                      <label
                        key={item.id}
                        className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/20 px-4 py-3 text-sm text-white"
                      >
                        <input
                          defaultChecked={linkedSecretariaIds.has(item.id)}
                          name="secretariaIds"
                          type="checkbox"
                          value={item.id}
                        />
                        <span className="min-w-0">
                          <span className="block font-medium">{item.nomeSecretaria}</span>
                          <span className="mt-1 block text-xs text-slate-300">
                            Unidade {formatGovernmentCode(item.unidadeOrcamentaria)}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>

                  {secretarias.length > 4 ? (
                    <details className="mt-3 group">
                      <summary className="cursor-pointer list-none rounded-2xl border border-white/10 bg-slate-950/25 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-950/35">
                        <span className="group-open:hidden">Ver mais secretarias</span>
                        <span className="hidden group-open:inline">Ver menos secretarias</span>
                      </summary>
                      <div className="mt-3 grid gap-3">
                        {secretarias.slice(4).map((item) => (
                          <label
                            key={item.id}
                            className="flex items-start gap-3 rounded-2xl border border-white/10 bg-slate-950/20 px-4 py-3 text-sm text-white"
                          >
                            <input
                              defaultChecked={linkedSecretariaIds.has(item.id)}
                              name="secretariaIds"
                              type="checkbox"
                              value={item.id}
                            />
                            <span className="min-w-0">
                              <span className="block font-medium">{item.nomeSecretaria}</span>
                              <span className="mt-1 block text-xs text-slate-300">
                                Unidade {formatGovernmentCode(item.unidadeOrcamentaria)}
                              </span>
                            </span>
                          </label>
                        ))}
                      </div>
                    </details>
                  ) : null}
                </div>
                <p className="text-xs leading-5 text-slate-300">
                  Para usuário de secretaria, selecione uma ou mais secretarias. Toda operação ficará auditada com a secretaria escolhida no envio do lote.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <Button type="submit">{editingUser ? "Salvar alterações" : "Cadastrar usuário"}</Button>
                {editingUser ? (
                  <Link href={buildUsuariosHref({ edit: undefined })}>
                    <Button type="button" variant="outline">
                      Cancelar edição
                    </Button>
                  </Link>
                ) : (
                  <Button type="reset" variant="outline">
                    Limpar campos
                  </Button>
                )}
              </div>
            </form>
          </SimpleFormCard>

          <SimpleFormCard
            className="min-w-0 self-start"
            description="Utilize esta área quando houver perda de credencial. A redefinição gera nova senha temporária e permanece registrada na auditoria."
            title="Recuperação administrativa de acesso"
          >
            <form action={resetUserPasswordAction} className="space-y-5">
              <input name="contextQ" type="hidden" value={q} />
              <input name="contextPage" type="hidden" value={String(usersPage.page)} />
              {resetSuccess ? (
                <div className="rounded-2xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-3 text-sm leading-6 text-emerald-100">
                  {resetSuccess}
                </div>
              ) : null}
              <FormError message={resetError} />

              <div className="space-y-2">
                <Label htmlFor="userId">Usuário</Label>
                <Select
                  id="userId"
                  name="userId"
                  options={resetUserOptions.map((item) => ({
                    value: item.id,
                    label: `${item.nome} • ${formatCpf(item.cpf)}`,
                  }))}
                  placeholder="Selecione o usuário que receberá nova senha"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reset-password">Nova senha temporária</Label>
                <Input id="reset-password" name="password" required type="password" />
                <p className="text-xs leading-5 text-slate-300">{getPasswordPolicyMessage()}</p>
              </div>

              <SectionNote>
                Oriente o usuário a alterar a credencial após o primeiro acesso. Cada redefinição fica registrada na trilha de auditoria institucional.
              </SectionNote>

              <Button type="submit" variant="outline">
                Redefinir senha
              </Button>
            </form>
          </SimpleFormCard>
        </div>

        <SimpleFormCard
          className="min-w-0 self-start"
          description="Consulte rapidamente usuários por nome, CPF, perfil ou secretarias vinculadas, com ações administrativas completas e leitura adequada para desktop."
          title="Usuários cadastrados"
        >
          <div className="space-y-5">
            <form className="grid gap-3 md:grid-cols-[minmax(0,1fr),132px]">
              <Input defaultValue={q} name="q" placeholder="Buscar por nome, CPF, e-mail ou secretaria" />
              <Button className="w-full" type="submit" variant="outline">
                Buscar
              </Button>
            </form>

            {users.length ? (
              <>
                <div className="grid gap-4 xl:hidden">
                  {users.map((item) => (
                    <article
                      key={item.id}
                      className="rounded-[1.5rem] border border-white/10 bg-white/95 px-5 py-4 text-slate-900 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-base font-semibold text-slate-950">{item.nome}</p>
                          <p className="mt-1 break-words text-sm text-slate-600">{item.email}</p>
                        </div>
                        <Badge className="whitespace-nowrap" variant={statusVariant[item.status]}>
                          {item.status}
                        </Badge>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">CPF</p>
                          <p className="mt-1 text-sm text-slate-800">{formatCpf(item.cpf)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Perfil</p>
                          <p className="mt-1 text-sm text-slate-800">{roleLabel[item.role]}</p>
                        </div>
                        <div className="sm:col-span-2">
                          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Secretarias autorizadas</p>
                          <div className="mt-1">{renderLinkedSecretarias(item.secretariasVinculadas)}</div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link href={buildUsuariosHref({ edit: item.id })}>
                          <Button size="sm" type="button" variant="outline">
                            <SquarePen className="mr-2 h-4 w-4" />
                            Editar
                          </Button>
                        </Link>
                        <form action={toggleUserStatusAction.bind(null, item.id)}>
                          <input name="contextQ" type="hidden" value={q} />
                          <input name="contextPage" type="hidden" value={String(usersPage.page)} />
                          <Button size="sm" type="submit" variant="outline">
                            {item.status === "ATIVO" ? "Inativar" : "Reativar"}
                          </Button>
                        </form>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="hidden overflow-x-auto rounded-[1.5rem] border border-white/10 bg-white/95 xl:block">
                  <table className="min-w-[1260px] w-full text-sm text-slate-900">
                    <thead className="bg-[linear-gradient(180deg,rgba(241,245,249,0.98),rgba(226,232,240,0.98))]">
                      <tr>
                        <th className="px-5 py-4 text-left font-semibold">Nome</th>
                        <th className="px-5 py-4 text-left font-semibold">CPF</th>
                        <th className="px-5 py-4 text-left font-semibold">Perfil</th>
                        <th className="px-5 py-4 text-left font-semibold">Secretaria padrão</th>
                        <th className="px-5 py-4 text-left font-semibold">Secretarias autorizadas</th>
                        <th className="px-5 py-4 text-left font-semibold">Status</th>
                        <th className="px-5 py-4 text-left font-semibold">E-mail</th>
                        <th className="px-5 py-4 text-left font-semibold">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((item) => (
                        <tr key={item.id} className="border-t border-slate-200/80 align-top">
                          <td className="px-5 py-4">
                            <div className="max-w-[220px]">
                              <p className="line-clamp-2 font-semibold text-slate-950">{item.nome}</p>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-5 py-4">{formatCpf(item.cpf)}</td>
                          <td className="whitespace-nowrap px-5 py-4">{roleLabel[item.role]}</td>
                          <td className="px-5 py-4">
                            <div className="max-w-[240px] leading-6 text-slate-700">
                              {item.secretaria?.nomeSecretaria ?? "Sem secretaria padrão"}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="max-w-[320px]">{renderLinkedSecretarias(item.secretariasVinculadas)}</div>
                          </td>
                          <td className="whitespace-nowrap px-5 py-4">
                            <Badge className="whitespace-nowrap" variant={statusVariant[item.status]}>
                              {item.status}
                            </Badge>
                          </td>
                          <td className="px-5 py-4">
                            <div className="max-w-[240px] break-words leading-6 text-slate-600">{item.email}</div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-2">
                              <Link href={buildUsuariosHref({ edit: item.id })}>
                                <Button size="sm" type="button" variant="outline">
                                  Editar
                                </Button>
                              </Link>
                              <form action={toggleUserStatusAction.bind(null, item.id)}>
                                <input name="contextQ" type="hidden" value={q} />
                                <input name="contextPage" type="hidden" value={String(usersPage.page)} />
                                <Button size="sm" type="submit" variant="outline">
                                  {item.status === "ATIVO" ? "Inativar" : "Reativar"}
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
                  page={usersPage.page}
                  pageSize={usersPage.pageSize}
                  pathname="/dashboard/admin/usuarios"
                  query={{ q: q || undefined }}
                  total={usersPage.total}
                  totalPages={usersPage.totalPages}
                />
              </>
            ) : (
              <EmptyState
                description="Ajuste os filtros de busca ou cadastre um novo usuário administrativo ou setorial."
                title="Nenhum usuário localizado"
              />
            )}
          </div>
        </SimpleFormCard>
      </div>
    </div>
  );
}

import Link from "next/link";
import { ArrowRight, Building2, FileSearch, ScrollText, Users } from "lucide-react";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { formatCpf, formatGovernmentCode } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/services/authorization.service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function ResultHeader({
  title,
  count,
  icon,
}: {
  title: string;
  count: number;
  icon: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">{icon}</span>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="mt-1">Resultados mais aderentes ao termo informado.</CardDescription>
        </div>
      </div>
      <Badge variant="neutral">{count}</Badge>
    </div>
  );
}

export default async function BuscaPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole("ADMIN_PLANEJAMENTO");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const numericTerm = q.replace(/\D/g, "");

  const [remanejamentos, executados, users, secretarias] = q
    ? await Promise.all([
        prisma.remanejamento.findMany({
          where: {
            OR: [
              { protocolo: { contains: q, mode: "insensitive" } },
              { nomeSolicitante: { contains: q, mode: "insensitive" } },
              { cpfSolicitante: { contains: numericTerm } },
              { nomeSecretaria: { contains: q, mode: "insensitive" } },
            ],
          },
          take: 8,
          orderBy: { createdAt: "desc" },
        }),
        prisma.remanejamentoExecutado.findMany({
          where: {
            OR: [
              { protocolo: { contains: q, mode: "insensitive" } },
              { nomeSolicitante: { contains: q, mode: "insensitive" } },
              { cpfSolicitante: { contains: numericTerm } },
              { secretaria: { contains: q, mode: "insensitive" } },
            ],
          },
          take: 8,
          orderBy: { dataRemanejamento: "desc" },
        }),
        prisma.user.findMany({
          where: {
            OR: [
              { nome: { contains: q, mode: "insensitive" } },
              { cpf: { contains: numericTerm } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          },
          include: { secretaria: true },
          take: 8,
          orderBy: { nome: "asc" },
        }),
        prisma.secretaria.findMany({
          where: {
            OR: [
              { nomeSecretaria: { contains: q, mode: "insensitive" } },
              { nomeSecretario: { contains: q, mode: "insensitive" } },
              { unidadeOrcamentaria: { contains: numericTerm } },
            ],
          },
          take: 8,
          orderBy: { nomeSecretaria: "asc" },
        }),
      ])
    : [[], [], [], []];

  const total = remanejamentos.length + executados.length + users.length + secretarias.length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administração"
        title="Busca global administrativa"
        description="Localize rapidamente protocolos, CPFs, solicitantes, usuários, secretarias e registros executados a partir de uma única consulta operacional."
        aside={
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
              <p className="text-sm text-white/70">Resultados consolidados</p>
              <p className="mt-2 text-3xl font-semibold">{total}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
              <p className="text-sm text-white/70">Escopo</p>
              <p className="mt-2 text-base font-semibold">Protocolos, pessoas e secretarias</p>
            </div>
          </div>
        }
      />

      <Card className="bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(246,244,239,0.94))]">
        <CardTitle>Pesquisa consolidada</CardTitle>
        <CardDescription className="mt-2">
          Busque por protocolo, CPF, nome do solicitante, e-mail, secretaria ou unidade orçamentária.
        </CardDescription>

        <form className="mt-6 grid gap-3 md:grid-cols-[1fr,auto]">
          <input
            className="h-11 w-full rounded-xl border bg-white px-3 text-sm"
            defaultValue={q}
            name="q"
            placeholder="Digite protocolo, CPF, nome, secretaria ou unidade"
          />
          <button className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground" type="submit">
            Buscar
          </button>
        </form>
      </Card>

      {!q ? (
        <EmptyState
          title="Informe um termo para iniciar a busca"
          description="A busca global foi preparada para acelerar a localização de registros administrativos em todo o sistema."
        />
      ) : total === 0 ? (
        <EmptyState
          title="Nenhum resultado encontrado"
          description="Tente um protocolo, CPF, nome ou secretaria diferente para ampliar a consulta."
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(245,247,248,0.94))]">
            <ResultHeader count={remanejamentos.length} icon={<FileSearch className="h-4 w-4" />} title="Solicitações" />
            <div className="mt-4 space-y-3">
              {remanejamentos.map((item) => (
                <div key={item.id} className="rounded-2xl border bg-white p-4 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{item.protocolo}</p>
                      <p className="mt-1 text-muted-foreground">{item.nomeSecretaria}</p>
                    </div>
                    <Badge variant={item.status === "REALIZADO" ? "success" : item.status === "CANCELADO" ? "danger" : "warning"}>
                      {item.status}
                    </Badge>
                  </div>
                  <p className="mt-3 text-muted-foreground">
                    {item.nomeSolicitante} • {formatCpf(item.cpfSolicitante)}
                  </p>
                  <div className="mt-3">
                    <Link className="inline-flex items-center gap-2 text-sm font-medium text-primary" href="/dashboard/remanejamentos">
                      Abrir painel de solicitações
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(245,247,248,0.94))]">
            <ResultHeader count={executados.length} icon={<ScrollText className="h-4 w-4" />} title="Executados" />
            <div className="mt-4 space-y-3">
              {executados.map((item) => (
                <div key={item.id} className="rounded-2xl border bg-white p-4 text-sm">
                  <p className="font-semibold">{item.protocolo}</p>
                  <p className="mt-1 text-muted-foreground">{item.secretaria}</p>
                  <p className="mt-3 text-muted-foreground">
                    {item.nomeSolicitante} • {formatCpf(item.cpfSolicitante)}
                  </p>
                  <div className="mt-3">
                    <Link className="inline-flex items-center gap-2 text-sm font-medium text-primary" href="/dashboard/executados">
                      Abrir executados
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(245,247,248,0.94))]">
            <ResultHeader count={users.length} icon={<Users className="h-4 w-4" />} title="Usuários" />
            <div className="mt-4 space-y-3">
              {users.map((item) => (
                <div key={item.id} className="rounded-2xl border bg-white p-4 text-sm">
                  <p className="font-semibold">{item.nome}</p>
                  <p className="mt-1 text-muted-foreground">{item.email}</p>
                  <p className="mt-2 text-muted-foreground">
                    {formatCpf(item.cpf)} • {item.secretaria?.nomeSecretaria ?? "Sem secretaria vinculada"}
                  </p>
                  <div className="mt-3">
                    <Link className="inline-flex items-center gap-2 text-sm font-medium text-primary" href="/dashboard/admin/usuarios">
                      Abrir usuários
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(245,247,248,0.94))]">
            <ResultHeader count={secretarias.length} icon={<Building2 className="h-4 w-4" />} title="Secretarias" />
            <div className="mt-4 space-y-3">
              {secretarias.map((item) => (
                <div key={item.id} className="rounded-2xl border bg-white p-4 text-sm">
                  <p className="font-semibold">{item.nomeSecretaria}</p>
                  <p className="mt-1 text-muted-foreground">
                    Unidade {formatGovernmentCode(item.unidadeOrcamentaria)}
                  </p>
                  <p className="mt-2 text-muted-foreground">{item.nomeSecretario}</p>
                  <div className="mt-3">
                    <Link className="inline-flex items-center gap-2 text-sm font-medium text-primary" href="/dashboard/admin/secretarias">
                      Abrir secretarias
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

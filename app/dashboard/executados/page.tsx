import { PageHeader } from "@/components/shared/page-header";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { ExecutadosFilters } from "@/features/remanejamentos/executados-filters";
import { ExecutadosTable } from "@/features/remanejamentos/executados-table";
import { executadosFilterSchema } from "@/lib/validations/executados";
import { requireRole } from "@/services/authorization.service";
import { listRemanejamentosExecutados } from "@/services/remanejamento.service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ExecutadosPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole("ADMIN_PLANEJAMENTO");
  const rawParams = await searchParams;
  const filters = executadosFilterSchema.parse({
    secretaria: typeof rawParams.secretaria === "string" ? rawParams.secretaria : "",
    cpf: typeof rawParams.cpf === "string" ? rawParams.cpf : "",
    acao: typeof rawParams.acao === "string" ? rawParams.acao : "",
    fonte: typeof rawParams.fonte === "string" ? rawParams.fonte : "",
    elemento: typeof rawParams.elemento === "string" ? rawParams.elemento : "",
    dataInicial: typeof rawParams.dataInicial === "string" ? rawParams.dataInicial : "",
    dataFinal: typeof rawParams.dataFinal === "string" ? rawParams.dataFinal : "",
  });

  const data = await listRemanejamentosExecutados(filters);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Histórico executivo"
        title="Remanejamentos executados e consolidados"
        description="Visão administrativa dos registros já efetivados, com detalhamento de secretaria, responsável, CPF, período e dados completos de adição e anulação."
        aside={
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
              <p className="text-sm text-white/70">Total filtrado</p>
              <p className="mt-2 text-3xl font-semibold text-white">{data.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-4">
              <p className="text-sm text-white/70">Modo de leitura</p>
              <p className="mt-2 text-base font-semibold text-white">Consolidado executivo</p>
            </div>
          </div>
        }
      />

      <Card className="min-w-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(245,247,248,0.94))]">
        <CardTitle>Remanejamentos executados</CardTitle>
        <CardDescription className="mt-2">
          Filtros server-side por secretaria, período, CPF, ação, fonte e elemento, com exportação em CSV e XLSX.
        </CardDescription>
        <div className="mt-6 min-w-0 space-y-6">
          <ExecutadosFilters initialValues={filters} />
          <div className="min-w-0">
            <ExecutadosTable
              data={data.map((item) => ({
                protocolo: item.protocolo,
                dataRemanejamento: item.dataRemanejamento.toLocaleDateString("pt-BR"),
                secretaria: item.secretaria,
                unidadeOrcamentaria: item.unidadeOrcamentaria,
                nomeSecretario: item.nomeSecretario,
                nomeSolicitante: item.nomeSolicitante,
                cpfSolicitante: item.cpfSolicitante,
                adicaoAcao: item.adicaoAcao,
                adicaoFonte: item.adicaoFonte,
                adicaoElemento: item.adicaoElemento,
                adicaoValor: Number(item.adicaoValor),
                anulacaoAcao: item.anulacaoAcao,
                anulacaoFonte: item.anulacaoFonte,
                anulacaoElemento: item.anulacaoElemento,
                anulacaoValor: Number(item.anulacaoValor),
              }))}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

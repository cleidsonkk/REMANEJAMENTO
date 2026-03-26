import Link from "next/link";
import { CheckCircle2, Landmark, ShieldCheck, Workflow } from "lucide-react";
import { redirect } from "next/navigation";

import { LoginForm } from "@/features/auth/login-form";
import { auth } from "@/lib/auth";

const highlights = [
  "Controle institucional por secretaria",
  "Auditoria e rastreabilidade completa",
  "Fluxo administrativo de ponta a ponta",
];

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 lg:px-8 lg:py-10">
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(145deg,#f5f0e6_0%,#efe8da_40%,#eaf0ec_100%)]" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(15,118,110,0.14),transparent_20%),radial-gradient(circle_at_bottom_right,rgba(180,83,9,0.12),transparent_20%)]" />
      <div className="absolute inset-0 -z-10 institutional-grid opacity-15" />

      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl gap-6 lg:grid-cols-[minmax(0,1.05fr),minmax(420px,0.95fr)]">
        <section className="relative min-w-0 overflow-hidden rounded-[2.35rem] border border-slate-900/85 bg-[linear-gradient(155deg,rgba(4,12,24,0.99),rgba(8,24,44,0.99)_38%,rgba(12,36,58,0.98)_70%,rgba(13,71,84,0.95))] p-6 text-white shadow-glow md:p-8 lg:p-9">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.06),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(251,191,36,0.08),transparent_22%)]" />
          <div className="absolute inset-0 institutional-grid opacity-[0.08]" />

          <div className="relative flex h-full min-w-0 flex-col">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-[11px] uppercase tracking-[0.24em] text-slate-200">
                <Landmark className="h-4 w-4" />
                Prefeitura de Umbaúba
              </span>
              <span className="rounded-full border border-amber-300/20 bg-amber-300/12 px-3 py-1.5 text-[11px] uppercase tracking-[0.24em] text-amber-100">
                Ambiente interno
              </span>
            </div>

            <div className="mt-7 max-w-xl min-w-0">
              <p className="text-[11px] uppercase tracking-[0.3em] text-slate-300">Sistema da Prefeitura de Umbaúba</p>
              <h1 className="mt-3 text-[2rem] font-semibold leading-[1.02] tracking-[-0.05em] text-white md:text-[2.9rem]">
                Plataforma institucional para remanejamento orçamentário.
              </h1>
              <p className="mt-3 max-w-lg text-[13px] leading-6 text-slate-100 md:text-sm">
                Sistema institucional desenvolvido para gerenciar solicitações de remanejamento orçamentário entre
                secretarias, garantindo controle técnico das dotações, validação de saldo, registro de origem e destino
                dos recursos e histórico completo de cada operação realizada.
              </p>
              <p className="mt-3 max-w-lg text-[13px] leading-6 text-slate-100 md:text-sm">
                A plataforma permite acompanhamento em tempo real, padronização dos processos administrativos e
                segurança na execução orçamentária conforme as exigências da administração pública.
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link
                href="/login"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-medium text-white transition hover:bg-white/15"
              >
                Início institucional
              </Link>
              <a
                href="#acesso"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-amber-300/20 bg-amber-300/12 px-4 text-sm font-medium text-amber-100 transition hover:bg-amber-300/18"
              >
                Ir para o acesso
              </a>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-3">
              <div className="min-w-0 rounded-[1.35rem] border border-white/12 bg-white/8 p-4 backdrop-blur">
                <ShieldCheck className="h-4 w-4 text-amber-200" />
                <h2 className="mt-3 text-base font-semibold">Acesso seguro</h2>
                <p className="mt-2 text-[13px] leading-6 text-slate-100">
                  Autenticação institucional e segregação por perfil.
                </p>
              </div>
              <div className="min-w-0 rounded-[1.35rem] border border-white/12 bg-white/8 p-4 backdrop-blur">
                <Workflow className="h-4 w-4 text-amber-200" />
                <h2 className="mt-3 text-base font-semibold">Fluxo completo</h2>
                <p className="mt-2 text-[13px] leading-6 text-slate-100">
                  Solicitação, análise, execução e histórico consolidado.
                </p>
              </div>
              <div className="min-w-0 rounded-[1.35rem] border border-white/12 bg-white/8 p-4 backdrop-blur">
                <CheckCircle2 className="h-4 w-4 text-amber-200" />
                <h2 className="mt-3 text-base font-semibold">Base oficial</h2>
                <p className="mt-2 text-[13px] leading-6 text-slate-100">
                  Dados carregados a partir da planilha institucional enviada.
                </p>
              </div>
            </div>

            <div className="mt-auto pt-8">
              <div className="rounded-[1.55rem] border border-white/12 bg-white/6 p-5">
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-300">Diferenciais do ambiente</p>
                <div className="mt-3 grid gap-2.5 md:grid-cols-3">
                  {highlights.map((item) => (
                    <div
                      key={item}
                      className="min-w-0 rounded-2xl border border-white/10 bg-slate-950/28 px-3.5 py-3 text-[13px] leading-6 text-white"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div id="acesso" className="flex min-w-0 items-center justify-center">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}

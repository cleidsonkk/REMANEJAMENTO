"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

const COLORS = ["#0f766e", "#d97706", "#1d4ed8", "#be123c", "#7c3aed", "#0f172a"];

export function DashboardCharts({
  monthSeries,
  secretarias,
}: {
  monthSeries: Array<{ mes: string; valor: number }>;
  secretarias: Array<{ secretaria: string; quantidade: number; valor: number }>;
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr),minmax(0,1fr)]">
      <Card className="bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,247,248,0.94))]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle>Volume financeiro por mês</CardTitle>
            <CardDescription className="mt-2">Visão consolidada das solicitações recentes.</CardDescription>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase tracking-[0.22em] text-slate-500">
            Série mensal
          </div>
        </div>

        <div className="mt-6 h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthSeries}>
              <CartesianGrid stroke="#d9dee4" strokeDasharray="4 4" vertical={false} />
              <XAxis axisLine={false} dataKey="mes" tickLine={false} />
              <YAxis axisLine={false} tickFormatter={(value) => `R$ ${Number(value) / 1000}k`} tickLine={false} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Bar dataKey="valor" fill="#0b7285" radius={[12, 12, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,242,236,0.94))]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle>Ranking de secretarias</CardTitle>
            <CardDescription className="mt-2">
              Distribuição das solicitações e do volume financeiro por órgão.
            </CardDescription>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase tracking-[0.22em] text-slate-500">
            Leitura setorial
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,0.92fr),minmax(0,1.08fr)] lg:items-start">
          <div className="min-w-0">
            <div className="h-[280px] rounded-[1.75rem] border border-slate-200/80 bg-white/78 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={secretarias} dataKey="valor" innerRadius={58} nameKey="secretaria" outerRadius={108}>
                    {secretarias.map((entry, index) => (
                      <Cell key={entry.secretaria} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="min-w-0 space-y-3 lg:max-h-[320px] lg:overflow-y-auto lg:pr-1">
            {secretarias.map((item, index) => (
              <div
                key={item.secretaria}
                className="flex min-w-0 items-start gap-3 rounded-2xl border border-slate-200/80 bg-white/88 p-3 shadow-sm"
              >
                <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <div className="min-w-0">
                  <p className="line-clamp-2 break-words text-sm font-semibold leading-6 text-slate-900">
                    {item.secretaria}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {item.quantidade} solicitações • {formatCurrency(item.valor)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

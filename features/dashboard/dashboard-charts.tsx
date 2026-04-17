"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

const tooltipStyles = {
  borderRadius: "18px",
  border: "1px solid rgba(203, 213, 225, 0.9)",
  background: "rgba(255, 255, 255, 0.97)",
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.12)",
};

function formatAxisCurrency(value: number) {
  if (Math.abs(value) >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1)} mi`;
  }

  if (Math.abs(value) >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)} mil`;
  }

  return `R$ ${value}`;
}

function truncateLabel(value: string, limit = 22) {
  return value.length > limit ? `${value.slice(0, limit)}…` : value;
}

export function DashboardCharts({
  monthSeries,
  secretarias,
}: {
  monthSeries: Array<{ mes: string; valor: number }>;
  secretarias: Array<{ secretaria: string; quantidade: number; valor: number }>;
}) {
  const rankingChartHeight = Math.max(secretarias.length * 58, 250);

  return (
    <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.08fr),minmax(0,0.92fr)]">
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle>Volume financeiro por mês</CardTitle>
            <CardDescription className="mt-2">
              Evolução recente das solicitações registradas, com leitura mais limpa para acompanhamento gerencial.
            </CardDescription>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase tracking-[0.22em] text-slate-500">
            Série mensal
          </div>
        </div>

        {monthSeries.length ? (
          <div className="mt-6 h-[260px] sm:h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthSeries} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashboardVolumeFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#0b7285" stopOpacity={0.34} />
                    <stop offset="100%" stopColor="#0b7285" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#d9dee4" strokeDasharray="4 4" vertical={false} />
                <XAxis
                  axisLine={false}
                  dataKey="mes"
                  minTickGap={24}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  tickLine={false}
                  tickMargin={12}
                />
                <YAxis
                  axisLine={false}
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  tickFormatter={formatAxisCurrency}
                  tickLine={false}
                  width={82}
                />
                <Tooltip
                  contentStyle={tooltipStyles}
                  cursor={{ stroke: "#0b7285", strokeDasharray: "4 4", strokeOpacity: 0.35 }}
                  formatter={(value: number) => formatCurrency(Number(value))}
                  labelStyle={{ color: "#0f172a", fontWeight: 600 }}
                />
                <Area
                  dataKey="valor"
                  fill="url(#dashboardVolumeFill)"
                  fillOpacity={1}
                  stroke="#0b7285"
                  strokeWidth={3}
                  type="monotone"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="mt-6 rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50/80 p-8 text-sm leading-7 text-slate-600">
            Ainda não há movimentação suficiente para exibir a série mensal.
          </div>
        )}
      </Card>

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle>Ranking financeiro por secretaria</CardTitle>
            <CardDescription className="mt-2">
              Comparativo setorial com foco em volume financeiro e quantidade de solicitações no recorte atual.
            </CardDescription>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs uppercase tracking-[0.22em] text-slate-500">
            Leitura setorial
          </div>
        </div>

        {secretarias.length ? (
          <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr),minmax(280px,0.82fr)] xl:items-start">
            <div className="min-w-0 rounded-[1.75rem] border border-slate-200/80 bg-white/82 p-3">
              <div style={{ height: rankingChartHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={secretarias} layout="vertical" margin={{ top: 8, right: 18, left: 12, bottom: 8 }}>
                    <CartesianGrid horizontal={false} stroke="#e2e8f0" strokeDasharray="4 4" />
                    <XAxis axisLine={false} hide type="number" />
                    <YAxis
                      axisLine={false}
                      dataKey="secretaria"
                      tick={{ fill: "#475569", fontSize: 12 }}
                      tickFormatter={(value: string) => truncateLabel(value)}
                      tickLine={false}
                      type="category"
                      width={138}
                    />
                    <Tooltip
                      contentStyle={tooltipStyles}
                      formatter={(value: number) => formatCurrency(Number(value))}
                      labelFormatter={(label) => `Secretaria: ${label}`}
                      labelStyle={{ color: "#0f172a", fontWeight: 600 }}
                    />
                    <Bar dataKey="valor" fill="#0b7285" radius={[0, 12, 12, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="min-w-0 space-y-3">
              {secretarias.map((item, index) => (
                <div
                  key={item.secretaria}
                  className="rounded-2xl border border-slate-200/80 bg-white/88 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                        {String(index + 1).padStart(2, "0")}º lugar
                      </p>
                      <p className="mt-2 line-clamp-2 break-words text-sm font-semibold leading-6 text-slate-900">
                        {item.secretaria}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">
                      {item.quantidade}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                      {formatCurrency(item.valor)}
                    </span>
                    <span>{item.quantidade} solicitações</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50/80 p-8 text-sm leading-7 text-slate-600">
            Ainda não há secretarias com movimentação suficiente para gerar o ranking.
          </div>
        )}
      </Card>
    </div>
  );
}

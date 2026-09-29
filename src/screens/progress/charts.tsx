import type { ReactNode } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useData } from '../../app/data'
import { formatDate } from '../../ui/kit'

// Recessive chart chrome from the active theme: hairline solid grid, muted axis text.
function useChrome() {
  const { palette } = useData()
  return { GRID: palette.line, AXIS: { fill: palette.muted, fontSize: 11 }, SURFACE: palette.surface, CURSOR: palette.muted }
}

export interface Series {
  key: string
  label: string
  color: string
}

function TooltipBox({ title, rows }: { title: string; rows: { label: string; value: string; color: string }[] }) {
  return (
    <div className="rounded-xl border border-line bg-bg px-3 py-2 text-[13px] shadow-lg">
      <div className="text-muted">{title}</div>
      {rows.map((r) => (
        <div key={r.label} className="mt-1 flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: r.color }} />
          <span className="text-ink/80">{r.label}</span>
          <span className="ml-auto pl-3 font-semibold tabular-nums text-ink">{r.value}</span>
        </div>
      ))}
    </div>
  )
}

export function ChartLegend({ series }: { series: Series[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink/80">
      {series.map((s) => (
        <span key={s.key} className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full" style={{ background: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  )
}

const shortDate = (d: string) => formatDate(d, { day: 'numeric', month: 'short' })

/** Lines over time on one 0..max axis. Null values leave a gap rather than a fake zero. */
export function TrendLines<T extends { date: string }>({
  data,
  series,
  format,
  domain,
  height = 190,
}: {
  data: T[]
  series: Series[]
  format: (v: number) => string
  domain?: [number, number]
  height?: number
}) {
  const { GRID, AXIS, SURFACE, CURSOR } = useChrome()
  return (
    <div style={{ height }} className="-ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDate} tick={AXIS} axisLine={false} tickLine={false} minTickGap={24} />
          <YAxis domain={domain} tickFormatter={format} tick={AXIS} axisLine={false} tickLine={false} width={40} />
          <Tooltip
            cursor={{ stroke: CURSOR, strokeWidth: 1 }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <TooltipBox
                  title={`Week to ${shortDate(String(label))}`}
                  rows={series
                    .map((s) => {
                      const v = payload.find((p) => p.dataKey === s.key)?.value
                      return typeof v === 'number' ? { label: s.label, value: format(v), color: s.color } : null
                    })
                    .filter((r): r is NonNullable<typeof r> => r !== null)}
                />
              ) : null
            }
          />
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4.5, stroke: SURFACE, strokeWidth: 2, fill: s.color }}
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Stacked weekly columns with a 2px surface gap between segments. */
export function StackedColumns<T extends { date: string }>({ data, series, height = 170 }: { data: T[]; series: Series[]; height?: number }) {
  const { GRID, AXIS, SURFACE } = useChrome()
  return (
    <div style={{ height }} className="-ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }} barCategoryGap="30%">
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDate} tick={AXIS} axisLine={false} tickLine={false} minTickGap={24} />
          <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} width={40} />
          <Tooltip
            cursor={{ fill: 'color-mix(in srgb, var(--color-ink) 5%, transparent)' }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <TooltipBox
                  title={`Week to ${shortDate(String(label))}`}
                  rows={series.map((s) => ({
                    label: s.label,
                    value: String(payload.find((p) => p.dataKey === s.key)?.value ?? 0),
                    color: s.color,
                  }))}
                />
              ) : null
            }
          />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              stackId="a"
              fill={s.color}
              maxBarSize={24}
              stroke={SURFACE}
              strokeWidth={1}
              radius={i === series.length - 1 ? [4, 4, 0, 0] : 0}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ChartCard({ title, sub, children }: { title: string; sub?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-4 rounded-3xl bg-surface p-4">
      <h3 className="font-semibold">{title}</h3>
      {sub && <p className="mt-0.5 text-[13px] leading-snug text-muted">{sub}</p>}
      <div className="mt-3">{children}</div>
    </section>
  )
}

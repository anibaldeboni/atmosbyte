import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import type { AggregateMeasurementDto } from "../../shared/types/api"
import { ChartCard } from "../../shared/ui/ChartCard"
import { EmptyState } from "../../shared/ui/EmptyState"
import { InlineAlert } from "../../shared/ui/InlineAlert"
import { Skeleton } from "../../shared/ui/Skeleton"

interface HistoricalChartsProps {
  data: AggregateMeasurementDto[]
  loading: boolean
  error: string | null
}

interface ChartPoint {
  timestampMs: number
  tempMin: number | null
  tempAvg: number | null
  tempMax: number | null
  humMin: number | null
  humAvg: number | null
  humMax: number | null
  pressureMin: number | null
  pressureAvg: number | null
  pressureMax: number | null
}

function toChartData(data: AggregateMeasurementDto[]): ChartPoint[] {
  return data.map((item) => ({
    timestampMs: item.date * 1000,
    tempMin: item.temp.min ?? null,
    tempAvg: item.temp.average ?? null,
    tempMax: item.temp.max ?? null,
    humMin: item.humidity.min ?? null,
    humAvg: item.humidity.average ?? null,
    humMax: item.humidity.max ?? null,
    pressureMin: item.pressure.min != null ? item.pressure.min / 100 : null,
    pressureAvg: item.pressure.average != null ? item.pressure.average / 100 : null,
    pressureMax: item.pressure.max != null ? item.pressure.max / 100 : null,
  }))
}

function calculateDomain(data: ChartPoint[], keys: Array<keyof ChartPoint>): [number, number] {
  const values: number[] = []

  for (const row of data) {
    for (const key of keys) {
      const value = row[key]
      if (typeof value === "number" && Number.isFinite(value)) {
        values.push(value)
      }
    }
  }

  if (values.length === 0) {
    return [0, 1]
  }

  const min = Math.min(...values)
  const max = Math.max(...values)

  if (min === max) {
    const basePadding = Math.max(Math.abs(min) * 0.05, 1)
    return [min - basePadding, max + basePadding]
  }

  const span = max - min
  const padding = span * 0.08
  return [min - padding, max + padding]
}

function formatDateHour(value: number): { date: string; hour: string } {
  const date = new Date(value)
  const datePart = date.toLocaleDateString()
  const hourPart = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
  return { date: datePart, hour: hourPart }
}

function formatBrowserDateTime(value: number): string {
  return new Date(value).toLocaleString([], {
    dateStyle: "short",
    timeStyle: "short",
  })
}

function DateHourTick(props: { x?: number; y?: number; payload?: { value: number } }): React.JSX.Element {
  const x = props.x ?? 0
  const y = props.y ?? 0
  const value = props.payload?.value

  if (typeof value !== "number") {
    return <g />
  }

  const parts = formatDateHour(value)

  return (
    <g transform={`translate(${x},${y})`}>
      <text textAnchor="middle" fill="var(--chart-axis-text)" fontSize="12">
        <tspan x="0" dy="14">
          {parts.date}
        </tspan>
        <tspan x="0" dy="14">
          {parts.hour}
        </tspan>
      </text>
    </g>
  )
}

function MetricsLineChart({
  data,
  minKey,
  avgKey,
  maxKey,
}: {
  data: ChartPoint[]
  minKey: keyof ChartPoint
  avgKey: keyof ChartPoint
  maxKey: keyof ChartPoint
}): React.JSX.Element {
  const yDomain = calculateDomain(data, [minKey, avgKey, maxKey])

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--chart-grid-stroke)" strokeDasharray="3 3" />
          <XAxis dataKey="timestampMs" tick={<DateHourTick />} height={44} minTickGap={28} />
          <YAxis
            domain={yDomain}
            width={30}
            tickFormatter={(value) => String(Math.round(value))}
            tick={{ fill: "var(--chart-axis-text)", fontSize: 12 }}
            axisLine={{ stroke: "var(--chart-axis-line)" }}
            tickLine={{ stroke: "var(--chart-axis-line)" }}
          />
          <Tooltip
            labelFormatter={(value) => (typeof value === "number" ? formatBrowserDateTime(value) : value)}
            formatter={(value, name) => [typeof value === "number" ? value.toFixed(2) : value, name]}
          />
          <Line type="monotone" dataKey={minKey} name="Min." stroke="#22c55e" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey={avgKey} name="Méd" stroke="#3b82f6" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey={maxKey} name="Max" stroke="#ef4444" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function ChartLegend(): React.JSX.Element {
  return (
    <div className="historical-chart-legend flex items-center gap-4 text-[13px] font-semibold" aria-label="Legenda">
      <span className="inline-flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ef4444]" aria-hidden="true" />
        Max
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[#3b82f6]" aria-hidden="true" />
        Méd
      </span>
      <span className="inline-flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" aria-hidden="true" />
        Min.
      </span>
    </div>
  )
}

export function HistoricalCharts({ data, loading, error }: HistoricalChartsProps): React.JSX.Element {
  if (loading && data.length === 0) {
    return (
      <div className="grid gap-4" data-testid="historical-skeletons">
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  if (!loading && data.length === 0 && !error) {
    return <EmptyState title="Nenhum registro histórico" description="Tente expandir o intervalo de datas selecionado." />
  }

  const chartData = toChartData(data)

  return (
    <div className="grid gap-4">
      {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}
      <ChartCard title="Temperatura do ar (°C)" subtitle="Variação térmica no período selecionado" legend={<ChartLegend />}>
        <MetricsLineChart data={chartData} minKey="tempMin" avgKey="tempAvg" maxKey="tempMax" />
      </ChartCard>
      <ChartCard title="Umidade relativa (%)" subtitle="Oscilação da umidade do ar por período" legend={<ChartLegend />}>
        <MetricsLineChart data={chartData} minKey="humMin" avgKey="humAvg" maxKey="humMax" />
      </ChartCard>
      <ChartCard title="Pressão atmosférica (hPa)" subtitle="Monitoramento da pressão barométrica" legend={<ChartLegend />}>
        <MetricsLineChart data={chartData} minKey="pressureMin" avgKey="pressureAvg" maxKey="pressureMax" />
      </ChartCard>
    </div>
  )
}

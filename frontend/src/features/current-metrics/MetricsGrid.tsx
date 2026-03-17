import type { MeasurementDto } from "../../shared/types/api"
import { MetricCard } from "../../shared/ui/MetricCard"
import { Skeleton } from "../../shared/ui/Skeleton"

function TemperatureIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="h-[26px] w-[26px]" fill="none" role="img">
      <path
        d="M14 14.76V5a2 2 0 1 0-4 0v9.76a4 4 0 1 0 4 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 11v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function HumidityIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="h-[26px] w-[26px]" fill="none" role="img">
      <path
        d="M12 3.5C9 7.5 6 10.2 6 14a6 6 0 1 0 12 0c0-3.8-3-6.5-6-10.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PressureIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="h-[26px] w-[26px]" fill="none" role="img">
      <path d="M5 15h3M10.5 12h3M16 9h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

interface MetricsGridProps {
  data: MeasurementDto | null
  loading: boolean
}

function formatValue(value: number, unit: string): string {
  return `${value.toFixed(1)} ${unit}`
}

export function MetricsGrid({ data, loading }: MetricsGridProps): React.JSX.Element {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3" data-testid="metrics-skeleton-grid">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (!data) {
    return <p className="metric-empty-text text-sm">No measurement data available.</p>
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <MetricCard
        label="Temperature"
        value={formatValue(data.temperature, "C")}
        helper={`Source: ${data.source}`}
        icon={<TemperatureIcon />}
      />
      <MetricCard label="Humidity" value={formatValue(data.humidity, "%")} icon={<HumidityIcon />} />
      <MetricCard label="Pressure" value={formatValue(data.pressure / 100, "hPa")} icon={<PressureIcon />} />
    </div>
  )
}

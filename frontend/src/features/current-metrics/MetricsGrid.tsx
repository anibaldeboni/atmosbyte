import type { MeasurementDto } from "@/shared/types/api"
import { HumidityIcon, PressureIcon, TemperatureIcon } from "@/shared/ui/icons/metrics"
import { EmptyState } from "@/shared/ui/EmptyState"
import { MetricCard } from "@/shared/ui/MetricCard"
import { Skeleton } from "@/shared/ui/Skeleton"


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

    return (
      <EmptyState title="Dados meteorológicos indisponíveis." description="Tente atualizar a página." />
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <MetricCard
        label="Temperatura"
        value={formatValue(data.temperature, "°C")}
        helper={`Fonte: ${data.source}`}
        icon={<TemperatureIcon className="metric-card-icon-svg" role="img" />}
      />
      <MetricCard label="Umidade" value={formatValue(data.humidity, "%")} icon={<HumidityIcon className="metric-card-icon-svg" role="img" />} />
      <MetricCard label="Pressão" value={formatValue(data.pressure / 100, "hPa")} icon={<PressureIcon className="metric-card-icon-svg" role="img" />} />
    </div>
  )
}

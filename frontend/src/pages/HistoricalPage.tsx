import { lazy, Suspense, useMemo } from "react"

import { HistoricalFiltersForm } from "../features/historical/HistoricalFiltersForm"
import { useHistoricalData } from "../features/historical/useHistoricalData"
import { Skeleton } from "../shared/ui/Skeleton"
import type { AggregationKind } from "../shared/types/status"

interface HistoricalPageProps {
}

interface FilterValues {
  from: string
  to: string
  type: AggregationKind
}

const HistoricalCharts = lazy(async () => {
  const module = await import("../features/historical/HistoricalCharts")
  return { default: module.HistoricalCharts }
})

function toIso(value: string): string {
  return new Date(value).toISOString()
}

export function HistoricalPage({ }: HistoricalPageProps): JSX.Element {
  const { data, loading, error, load } = useHistoricalData()

  const handlers = useMemo(
    () => ({
      onApply: (values: FilterValues) => {
        void load({
          from: toIso(values.from),
          to: toIso(values.to),
          type: values.type,
        })
      },
      onExport: (values: FilterValues) => {
        const params = new URLSearchParams({
          from: toIso(values.from),
          to: toIso(values.to),
          type: values.type,
        })
        window.location.assign(`/data/export?${params.toString()}`)
      },
    }),
    [load],
  )

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-[42px] font-extrabold tracking-[-0.02em] text-slate-900">Análise do Histórico Meteorológico</h2>
        <p className="mt-1 text-[18px] text-[#667085]">Visualização de dados meteorológicos históricos</p>
      </section>
      <HistoricalFiltersForm onApply={handlers.onApply} onExport={handlers.onExport} />
      <Suspense fallback={<Skeleton className="h-72 w-full" />}>
        <HistoricalCharts data={data} loading={loading} error={error} />
      </Suspense>
    </div>
  )
}

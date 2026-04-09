import { HistoricalFiltersForm } from "@/features/historical/HistoricalFiltersForm"
import { useHistoricalData } from "@/features/historical/useHistoricalData"
import type { AggregationKind } from "@/shared/types/status"
import { Skeleton } from "@/shared/ui/Skeleton"
import { TZDate } from "@date-fns/tz"
import { parse } from "date-fns"
import { lazy, Suspense, useMemo } from "react"


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

const LOCAL_DATE_TIME_PATTERN = "yyyy-MM-dd'T'HH:mm"

export function HistoricalPage({ }: HistoricalPageProps): React.JSX.Element {
  const { data, loading, error, load } = useHistoricalData()

  const handlers = useMemo(
    () => ({
      onApply: (values: FilterValues) => {
        const fromLocalDate = parse(values.from, LOCAL_DATE_TIME_PATTERN, new Date())
        const toLocalDate = parse(values.to, LOCAL_DATE_TIME_PATTERN, new Date())
        const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

        const fromIso = browserTimeZone
          ? TZDate.tz(
            browserTimeZone,
            fromLocalDate.getFullYear(),
            fromLocalDate.getMonth(),
            fromLocalDate.getDate(),
            fromLocalDate.getHours(),
            fromLocalDate.getMinutes(),
            fromLocalDate.getSeconds(),
            fromLocalDate.getMilliseconds(),
          )
          : fromLocalDate

        const toIso = browserTimeZone
          ? TZDate.tz(
            browserTimeZone,
            toLocalDate.getFullYear(),
            toLocalDate.getMonth(),
            toLocalDate.getDate(),
            toLocalDate.getHours(),
            toLocalDate.getMinutes(),
            toLocalDate.getSeconds(),
            toLocalDate.getMilliseconds(),
          )
          : toLocalDate

        void load({
          from: new Date(fromIso.getTime()).toISOString(),
          to: new Date(toIso.getTime()).toISOString(),
          type: values.type,
        })
      },
      onExport: (values: FilterValues) => {
        const fromLocalDate = parse(values.from, LOCAL_DATE_TIME_PATTERN, new Date())
        const toLocalDate = parse(values.to, LOCAL_DATE_TIME_PATTERN, new Date())
        const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone

        const fromIso = browserTimeZone
          ? TZDate.tz(
            browserTimeZone,
            fromLocalDate.getFullYear(),
            fromLocalDate.getMonth(),
            fromLocalDate.getDate(),
            fromLocalDate.getHours(),
            fromLocalDate.getMinutes(),
            fromLocalDate.getSeconds(),
            fromLocalDate.getMilliseconds(),
          )
          : fromLocalDate

        const toIso = browserTimeZone
          ? TZDate.tz(
            browserTimeZone,
            toLocalDate.getFullYear(),
            toLocalDate.getMonth(),
            toLocalDate.getDate(),
            toLocalDate.getHours(),
            toLocalDate.getMinutes(),
            toLocalDate.getSeconds(),
            toLocalDate.getMilliseconds(),
          )
          : toLocalDate

        const params = new URLSearchParams({
          from: new Date(fromIso.getTime()).toISOString(),
          to: new Date(toIso.getTime()).toISOString(),
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
        <h2 className="page-heading text-[42px] font-extrabold tracking-[-0.02em]">Histórico meteorológico</h2>
        <p className="page-subheading mt-1 text-[18px]">Visualização de dados meteorológicos históricos</p>
      </section>
      <HistoricalFiltersForm onApply={handlers.onApply} onExport={handlers.onExport} />
      <Suspense fallback={<Skeleton className="h-72 w-full" />}>
        <HistoricalCharts data={data} loading={loading} error={error} />
      </Suspense>
    </div>
  )
}

import { useEffect, useRef, useState } from "react"

import { Button } from "../../shared/ui/Button"
import { InlineAlert } from "../../shared/ui/InlineAlert"
import type { AggregationKind } from "../../shared/types/status"

interface HistoricalFiltersValues {
  from: string
  to: string
  type: AggregationKind
}

interface HistoricalFiltersFormProps {
  onApply: (values: HistoricalFiltersValues) => void
  onExport: (values: HistoricalFiltersValues) => void
}

function toDateInput(date: Date): string {
  const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000
  const localDate = new Date(date.getTime() - timezoneOffsetMs)
  return localDate.toISOString().slice(0, 16)
}

export function HistoricalFiltersForm({ onApply, onExport }: HistoricalFiltersFormProps): React.JSX.Element {
  const now = new Date()
  const [from, setFrom] = useState<string>(toDateInput(new Date(now.getTime() - 24 * 60 * 60 * 1000)))
  const [to, setTo] = useState<string>(toDateInput(now))
  const [type, setType] = useState<AggregationKind>("h")
  const [error, setError] = useState<string | null>(null)
  const didAutoLoadRef = useRef<boolean>(false)

  const values: HistoricalFiltersValues = { from, to, type }

  useEffect(() => {
    if (didAutoLoadRef.current) {
      return
    }

    didAutoLoadRef.current = true
    onApply(values)
  }, [onApply, values])

  const validate = (): boolean => {
    const fromDate = new Date(from)
    const toDate = new Date(to)
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
      setError("Please provide valid date range values.")
      return false
    }
    if (fromDate.getTime() > toDate.getTime()) {
      setError("From date must be before or equal to To date.")
      return false
    }
    setError(null)
    return true
  }

  const handleApply = () => {
    if (!validate()) {
      return
    }
    onApply(values)
  }

  const handleExport = () => {
    if (!validate()) {
      return
    }
    onExport(values)
  }

  return (
    <section className="historical-filters-card max-w-full overflow-hidden rounded-xl border p-4 shadow-sm">
      <div className="grid gap-4 md:grid-cols-4">
        <label className="historical-field-label min-w-0 text-sm font-medium">
          De
          <input
            className="historical-field-control mt-1 block w-full min-w-0 rounded-md border px-3 py-2 text-[16px]"
            type="datetime-local"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>
        <label className="historical-field-label min-w-0 text-sm font-medium">
          Até
          <input
            className="historical-field-control mt-1 block w-full min-w-0 rounded-md border px-3 py-2 text-[16px]"
            type="datetime-local"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>
        <label className="historical-field-label min-w-0 text-sm font-medium">
          Granularidade
          <select
            className="historical-field-control mt-1 block w-full min-w-0 rounded-md border px-3 py-2 text-[16px]"
            value={type}
            onChange={(event) => setType(event.target.value as AggregationKind)}
          >
            <option value="m">Minuto</option>
            <option value="h">Hora</option>
            <option value="d">Dia</option>
          </select>
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:flex md:items-end">
          <Button type="button" onClick={handleApply} className="w-full md:w-auto">
            Carregar
          </Button>
          <Button type="button" onClick={handleExport} className="w-full bg-slate-700 hover:bg-slate-600 md:w-auto">
            Exportar CSV
          </Button>
        </div>
      </div>
      {error ? (
        <div className="mt-4">
          <InlineAlert tone="error">{error}</InlineAlert>
        </div>
      ) : null}
    </section>
  )
}

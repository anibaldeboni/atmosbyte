import { forwardRef, useEffect, useRef, useState } from "react"
import DatePicker from "react-datepicker"

import { Button } from "../../shared/ui/Button"
import { InlineAlert } from "../../shared/ui/InlineAlert"
import type { AggregationKind } from "../../shared/types/status"
import { formatDateTimeForBrowserLocale, fromDateToLocalDateTime, fromLocalDateTimeToDate } from "./dateTimeLocal"

interface HistoricalFiltersValues {
  from: string
  to: string
  type: AggregationKind
}

interface HistoricalFiltersFormProps {
  onApply: (values: HistoricalFiltersValues) => void
  onExport: (values: HistoricalFiltersValues) => void
}

interface DatePickerInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  calendarLabel: string
  onCalendarClick: () => void
}

const DatePickerInput = forwardRef<HTMLInputElement, DatePickerInputProps>(function DatePickerInput(
  { className, calendarLabel, onCalendarClick, ...props },
  ref,
) {
  return (
    <span className="historical-datepicker-input-wrap mt-1 block w-full min-w-0">
      <input
        {...props}
        ref={ref}
        className={className}
      />
      <button
        type="button"
        aria-label={calendarLabel}
        className="historical-datepicker-icon"
        onMouseDown={(event) => event.preventDefault()}
        onClick={onCalendarClick}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>
    </span>
  )
})

export function HistoricalFiltersForm({ onApply, onExport }: HistoricalFiltersFormProps): React.JSX.Element {
  const now = new Date()
  const [from, setFrom] = useState<string>(fromDateToLocalDateTime(new Date(now.getTime() - 24 * 60 * 60 * 1000)))
  const [to, setTo] = useState<string>(fromDateToLocalDateTime(now))
  const [type, setType] = useState<AggregationKind>("h")
  const [error, setError] = useState<string | null>(null)
  const [fromOpen, setFromOpen] = useState<boolean>(false)
  const [toOpen, setToOpen] = useState<boolean>(false)
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
    <section className="historical-filters-card max-w-full rounded-xl border p-4 shadow-sm">
      <div className="grid gap-4 md:grid-cols-4">
        <label className="historical-field-label historical-field-row min-w-0 text-sm font-medium">
          De
          <DatePicker
            selected={fromLocalDateTimeToDate(from)}
            onChange={(value: Date | null) => {
              if (value instanceof Date) {
                setFrom(fromDateToLocalDateTime(value))
              }
            }}
            onChangeRaw={(event) => {
              if (event?.target instanceof HTMLInputElement) {
                setFrom(event.target.value.replace(" ", "T"))
              }
            }}
            onInputClick={() => setFromOpen(true)}
            onClickOutside={() => setFromOpen(false)}
            onCalendarClose={() => setFromOpen(false)}
            onSelect={() => setFromOpen(false)}
            open={fromOpen}
            showTimeSelect
            timeIntervals={1}
            customInputRef="input"
            value={formatDateTimeForBrowserLocale(fromLocalDateTimeToDate(from))}
            timeFormat="HH:mm"
            portalId="root"
            popperPlacement="bottom-start"
            popperProps={{ strategy: "fixed" }}
            customInput={(
              <DatePickerInput
                calendarLabel="Abrir calendário De"
                onCalendarClick={() => setFromOpen(true)}
                className="historical-field-control historical-datepicker-input block w-full min-w-0 rounded-md border px-3 py-2 pr-11 text-[16px]"
              />
            )}
          />
        </label>
        <label className="historical-field-label historical-field-row min-w-0 text-sm font-medium">
          Até
          <DatePicker
            selected={fromLocalDateTimeToDate(to)}
            onChange={(value: Date | null) => {
              if (value instanceof Date) {
                setTo(fromDateToLocalDateTime(value))
              }
            }}
            onChangeRaw={(event) => {
              if (event?.target instanceof HTMLInputElement) {
                setTo(event.target.value.replace(" ", "T"))
              }
            }}
            onInputClick={() => setToOpen(true)}
            onClickOutside={() => setToOpen(false)}
            onCalendarClose={() => setToOpen(false)}
            onSelect={() => setToOpen(false)}
            open={toOpen}
            showTimeSelect
            timeIntervals={1}
            customInputRef="input"
            value={formatDateTimeForBrowserLocale(fromLocalDateTimeToDate(to))}
            timeFormat="HH:mm"
            portalId="root"
            popperPlacement="bottom-start"
            popperProps={{ strategy: "fixed" }}
            customInput={(
              <DatePickerInput
                calendarLabel="Abrir calendário Até"
                onCalendarClick={() => setToOpen(true)}
                className="historical-field-control historical-datepicker-input block w-full min-w-0 rounded-md border px-3 py-2 pr-11 text-[16px]"
              />
            )}
          />
        </label>
        <label className="historical-field-label historical-field-row min-w-0 text-sm font-medium">
          Granularidade
          <select
            className="historical-field-control historical-inline-control block min-w-0 rounded-md border px-3 py-2 text-[16px] md:mt-1"
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
          <Button type="button" onClick={handleExport} className="app-button-secondary w-full md:w-auto">
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

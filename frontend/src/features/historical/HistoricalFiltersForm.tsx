import { forwardRef, useEffect, useRef, useState } from "react"
import DatePicker from "react-datepicker"
import { format, intlFormat, isValid, parse, subHours } from "date-fns"

import { Button } from "../../shared/ui/Button"
import { InlineAlert } from "../../shared/ui/InlineAlert"
import type { AggregationKind } from "../../shared/types/status"

const LOCAL_DATE_TIME_PATTERN = "yyyy-MM-dd'T'HH:mm"
const BROWSER_DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
}

function parseLocalDateTime(value: string): Date | null {
  const parsed = parse(value, LOCAL_DATE_TIME_PATTERN, new Date())
  if (!isValid(parsed)) {
    return null
  }

  return format(parsed, LOCAL_DATE_TIME_PATTERN) === value ? parsed : null
}

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
  const [from, setFrom] = useState<string>(format(subHours(now, 24), LOCAL_DATE_TIME_PATTERN))
  const [to, setTo] = useState<string>(format(now, LOCAL_DATE_TIME_PATTERN))
  const [type, setType] = useState<AggregationKind>("h")
  const [error, setError] = useState<string | null>(null)
  const [fromOpen, setFromOpen] = useState<boolean>(false)
  const [toOpen, setToOpen] = useState<boolean>(false)
  const didAutoLoadRef = useRef<boolean>(false)

  const values: HistoricalFiltersValues = { from, to, type }
  const fromDateValue = parseLocalDateTime(from)
  const toDateValue = parseLocalDateTime(to)

  useEffect(() => {
    if (didAutoLoadRef.current) {
      return
    }

    didAutoLoadRef.current = true
    onApply(values)
  }, [onApply, values])

  const validate = (): boolean => {
    if (!fromDateValue || !toDateValue) {
      setError("Please provide valid date range values.")
      return false
    }
    if (fromDateValue.getTime() > toDateValue.getTime()) {
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
            selected={fromDateValue}
            onChange={(value: Date | null) => {
              if (value instanceof Date) {
                setFrom(format(value, LOCAL_DATE_TIME_PATTERN))
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
            value={fromDateValue ? intlFormat(fromDateValue, BROWSER_DATE_TIME_OPTIONS) : ""}
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
            selected={toDateValue}
            onChange={(value: Date | null) => {
              if (value instanceof Date) {
                setTo(format(value, LOCAL_DATE_TIME_PATTERN))
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
            value={toDateValue ? intlFormat(toDateValue, BROWSER_DATE_TIME_OPTIONS) : ""}
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
        <div className="grid grid-cols-2 gap-2 md:flex md:items-end">
          <Button type="button" onClick={handleApply} className="w-full whitespace-nowrap px-3 text-xs sm:px-4 sm:text-sm md:w-auto">
            Carregar
          </Button>
          <Button
            type="button"
            onClick={handleExport}
            className="app-button-secondary w-full whitespace-nowrap px-3 text-xs sm:px-4 sm:text-sm md:w-auto"
          >
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

import type { AggregationKind } from "@/shared/types/status"
import { Button } from "@/shared/ui/Button"
import { InlineAlert } from "@/shared/ui/InlineAlert"
import { endOfDay, format, intlFormat, isSameDay, isValid, parse, startOfDay, startOfHour, subHours, subMonths } from "date-fns"
import { forwardRef, useEffect, useRef, useState } from "react"
import DatePicker from "react-datepicker"


const LOCAL_DATE_TIME_PATTERN = "yyyy-MM-dd'T'HH:mm"
const BROWSER_DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
}
const BROWSER_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}

function timeIntervalByType(type: AggregationKind): number {
  if (type === "h") {
    return 60
  }

  return 1
}

function buildRangeForType(type: AggregationKind, nowDate: Date): { from: Date; to: Date } {
  const anchoredNow = startOfHour(nowDate)

  if (type === "m") {
    return {
      from: subHours(anchoredNow, 1),
      to: anchoredNow,
    }
  }

  if (type === "d") {
    return {
      from: subMonths(anchoredNow, 1),
      to: anchoredNow,
    }
  }

  return {
    from: subHours(anchoredNow, 24),
    to: anchoredNow,
  }
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
  const initialRange = buildRangeForType("h", new Date())
  const [from, setFrom] = useState<string>(format(initialRange.from, LOCAL_DATE_TIME_PATTERN))
  const [to, setTo] = useState<string>(format(initialRange.to, LOCAL_DATE_TIME_PATTERN))
  const [type, setType] = useState<AggregationKind>("h")
  const [error, setError] = useState<string | null>(null)
  const [fromOpen, setFromOpen] = useState<boolean>(false)
  const [toOpen, setToOpen] = useState<boolean>(false)
  const didAutoLoadRef = useRef<boolean>(false)

  const values: HistoricalFiltersValues = { from, to, type }
  const fromDateValue = parseLocalDateTime(from)
  const toDateValue = parseLocalDateTime(to)
  const showTimeSelect = type !== "d"
  const timeIntervals = timeIntervalByType(type)
  const nowForPicker = new Date()
  const minTime = startOfDay(nowForPicker)
  const fromMaxTime = fromDateValue && isSameDay(fromDateValue, nowForPicker) ? nowForPicker : endOfDay(nowForPicker)
  const toMaxTime = toDateValue && isSameDay(toDateValue, nowForPicker) ? nowForPicker : endOfDay(nowForPicker)

  useEffect(() => {
    if (didAutoLoadRef.current) {
      return
    }

    didAutoLoadRef.current = true
    onApply(values)
  }, [onApply, values])

  const validate = (): boolean => {
    const nowDate = new Date()

    if (!fromDateValue || !toDateValue) {
      setError("Por favor forneça um intervalo de datas válido.")
      return false
    }
    if (fromDateValue.getTime() > nowDate.getTime() || toDateValue.getTime() > nowDate.getTime()) {
      setError("Os valores de data não podem estar no futuro.")
      return false
    }
    if (fromDateValue.getTime() > toDateValue.getTime()) {
      setError("A data de início deve ser anterior ou igual à data de término.")
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
            showTimeSelect={showTimeSelect}
            timeIntervals={timeIntervals}
            maxDate={nowForPicker}
            minTime={minTime}
            maxTime={fromMaxTime}
            customInputRef="input"
            value={fromDateValue ? intlFormat(fromDateValue, showTimeSelect ? BROWSER_DATE_TIME_OPTIONS : BROWSER_DATE_OPTIONS) : ""}
            timeFormat="HH:mm"
            portalId="root"
            popperPlacement="bottom-start"
            popperProps={{ strategy: "fixed" }}
            customInput={(
              <DatePickerInput
                calendarLabel="Abrir calendário De"
                onCalendarClick={() => setFromOpen(true)}
                className="historical-field-control historical-field-control-size historical-datepicker-input block w-full min-w-0 rounded-md border px-3 py-2 pr-11"
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
            showTimeSelect={showTimeSelect}
            timeIntervals={timeIntervals}
            maxDate={nowForPicker}
            minTime={minTime}
            maxTime={toMaxTime}
            customInputRef="input"
            value={toDateValue ? intlFormat(toDateValue, showTimeSelect ? BROWSER_DATE_TIME_OPTIONS : BROWSER_DATE_OPTIONS) : ""}
            timeFormat="HH:mm"
            portalId="root"
            popperPlacement="bottom-start"
            popperProps={{ strategy: "fixed" }}
            customInput={(
              <DatePickerInput
                calendarLabel="Abrir calendário Até"
                onCalendarClick={() => setToOpen(true)}
                className="historical-field-control historical-field-control-size historical-datepicker-input block w-full min-w-0 rounded-md border px-3 py-2 pr-11"
              />
            )}
          />
        </label>
        <label className="historical-field-label historical-field-row min-w-0 text-sm font-medium">
          Granularidade
          <select
            className="historical-field-control historical-field-control-size historical-inline-control block min-w-0 rounded-md border px-3 py-2 md:mt-1"
            value={type}
            onChange={(event) => {
              const selectedType = event.target.value as AggregationKind
              setType(selectedType)

              const adjustedRange = buildRangeForType(selectedType, new Date())
              setFrom(format(adjustedRange.from, LOCAL_DATE_TIME_PATTERN))
              setTo(format(adjustedRange.to, LOCAL_DATE_TIME_PATTERN))
            }}
          >
            <option value="m">Minuto</option>
            <option value="h">Hora</option>
            <option value="d">Dia</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2 md:flex md:items-end">
          <Button type="button" onClick={handleApply} size="sm" className="w-full whitespace-nowrap md:w-auto">
            Carregar
          </Button>
          <Button
            type="button"
            onClick={handleExport}
            variant="secondary"
            size="sm"
            className="w-full whitespace-nowrap md:w-auto"
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

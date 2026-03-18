export function fromDateToLocalDateTime(date: Date): string {
  const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000
  const localDate = new Date(date.getTime() - timezoneOffsetMs)
  return localDate.toISOString().slice(0, 16)
}

export function formatDateTimeForBrowserLocale(date: Date | null): string {
  if (!date) {
    return ""
  }

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function fromLocalDateTimeToDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return null
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return fromDateToLocalDateTime(parsed) === value ? parsed : null
}

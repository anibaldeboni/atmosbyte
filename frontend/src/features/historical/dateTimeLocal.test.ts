import { formatDateTimeForBrowserLocale, fromDateToLocalDateTime, fromLocalDateTimeToDate } from "./dateTimeLocal"

test("formats Date to local YYYY-MM-DDTHH:mm without timezone suffix", () => {
  const value = fromDateToLocalDateTime(new Date("2026-03-17T10:45:33.000Z"))

  expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  expect(value.includes("Z")).toBe(false)
})

test("round-trips local datetime string without changing minute precision", () => {
  const input = "2026-03-17T10:45"
  const parsed = fromLocalDateTimeToDate(input)

  expect(parsed).not.toBeNull()
  expect(fromDateToLocalDateTime(parsed as Date)).toBe(input)
})

test("returns null for invalid local datetime strings", () => {
  expect(fromLocalDateTimeToDate("")).toBeNull()
  expect(fromLocalDateTimeToDate("invalid")).toBeNull()
  expect(fromLocalDateTimeToDate("2026-03-17")).toBeNull()
  expect(fromLocalDateTimeToDate("2026-02-31T10:45")).toBeNull()
})

test("formats date using browser locale", () => {
  const formatterSpy = jest.spyOn(Intl, "DateTimeFormat")
  const result = formatDateTimeForBrowserLocale(new Date("2026-03-17T10:45:00.000Z"))

  expect(formatterSpy).toHaveBeenCalledWith(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
  expect(typeof result).toBe("string")
  formatterSpy.mockRestore()
})

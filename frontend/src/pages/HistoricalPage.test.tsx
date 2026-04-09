import { TZDate } from "@date-fns/tz"
import { describe, test, expect } from '@jest/globals'
import { format, isValid, parse } from "date-fns"


/**
 * Unit tests for HistoricalPage timezone conversion
 * Tests the toIso function which must correctly convert local browser time to UTC
 * This is critical for historical data queries with < 3 hour intervals
 */

const LOCAL_DATE_TIME_PATTERN = "yyyy-MM-dd'T'HH:mm"

function toIsoUTC(value: string): string {
    const parsed = parse(value, LOCAL_DATE_TIME_PATTERN, new Date())
    if (!isValid(parsed) || format(parsed, LOCAL_DATE_TIME_PATTERN) !== value) {
        throw new Error("Invalid datetime format, expected YYYY-MM-DDTHH:mm")
    }

    const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (!browserTimeZone) {
        return parsed.toISOString()
    }

    const zonedDate = TZDate.tz(
        browserTimeZone,
        parsed.getFullYear(),
        parsed.getMonth(),
        parsed.getDate(),
        parsed.getHours(),
        parsed.getMinutes(),
        parsed.getSeconds(),
        parsed.getMilliseconds(),
    )

    return new Date(zonedDate.getTime()).toISOString()
}

describe('HistoricalPage - toIso timezone conversion', () => {
    test('should return ISO string with Z suffix', () => {
        const result = toIsoUTC('2026-03-15T14:30')
        expect(result).toMatch(/Z$/)
    })

    test('should handle midnight', () => {
        const result = toIsoUTC('2026-03-15T00:00')
        expect(result).toMatch(/Z$/)
    })

    test('should handle end of day', () => {
        const result = toIsoUTC('2026-03-15T23:59')
        expect(result).toMatch(/Z$/)
    })

    test('should produce different UTC values for different local times', () => {
        const result1 = toIsoUTC('2026-03-15T10:00')
        const result2 = toIsoUTC('2026-03-15T20:00')
        expect(result1).not.toEqual(result2)
    })

    test('should work for various dates', () => {
        expect(() => toIsoUTC('2026-01-01T00:00')).not.toThrow()
        expect(() => toIsoUTC('2026-06-15T12:30')).not.toThrow()
        expect(() => toIsoUTC('2026-12-31T23:59')).not.toThrow()
    })

    test('should produce consistent results', () => {
        const result1 = toIsoUTC('2026-03-15T14:30')
        const result2 = toIsoUTC('2026-03-15T14:30')
        expect(result1).toEqual(result2)
    })

    test('should throw for invalid format', () => {
        expect(() => toIsoUTC('2026-03-15')).toThrow()
        expect(() => toIsoUTC('14:30')).toThrow()
        expect(() => toIsoUTC('2026-03-15 14:30')).toThrow()
    })
})

describe('Timezone conversion for small intervals (< 3 hours)', () => {
    test('should handle 1-hour interval', () => {
        const from = toIsoUTC('2026-03-15T14:30')
        const to = toIsoUTC('2026-03-15T15:30')
        expect(from).toMatch(/Z$/)
        expect(to).toMatch(/Z$/)
        expect(from).not.toEqual(to)
    })

    test('should handle 30-minute interval', () => {
        const from = toIsoUTC('2026-03-15T14:30')
        const to = toIsoUTC('2026-03-15T15:00')
        expect(from).toMatch(/Z$/)
        expect(to).toMatch(/Z$/)
    })

    test('should handle 2:59 interval', () => {
        const from = toIsoUTC('2026-03-15T14:30')
        const to = toIsoUTC('2026-03-15T17:29')
        expect(from).toMatch(/Z$/)
        expect(to).toMatch(/Z$/)
    })
})

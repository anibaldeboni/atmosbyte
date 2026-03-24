import { act, renderHook, waitFor } from "@testing-library/react"

import { client } from "../../shared/api/client"
import type { MeasurementDto } from "../../shared/types/api"
import { useCurrentMetrics } from "./useCurrentMetrics"

jest.mock("../../shared/api/client", () => ({
    client: {
        getMeasurements: jest.fn(),
        getHealth: jest.fn(),
        getQueue: jest.fn(),
    },
    ApiError: class extends Error {
        constructor(message: string) {
            super(message)
            this.name = "ApiError"
        }
    },
}))

const mockedClient = client as jest.Mocked<typeof client>

const measurement: MeasurementDto = {
    timestamp: "2026-03-24T00:00:00Z",
    temperature: 25,
    humidity: 60,
    pressure: 100900,
    source: "BME280",
}

function deferred<T>(): {
    promise: Promise<T>
    resolve: (value: T) => void
    reject: (reason?: unknown) => void
} {
    let resolve!: (value: T) => void
    let reject!: (reason?: unknown) => void
    const promise = new Promise<T>((res, rej) => {
        resolve = res
        reject = rej
    })
    return { promise, resolve, reject }
}

beforeEach(() => {
    jest.useFakeTimers()
    mockedClient.getMeasurements.mockReset()

    Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "visible",
    })
})

afterEach(() => {
    jest.useRealTimers()
})

test("refreshes immediately when the window gains focus", async () => {
    mockedClient.getMeasurements.mockResolvedValue(measurement)

    const { result } = renderHook(() => useCurrentMetrics())

    await waitFor(() => {
        expect(result.current.loading).toBe(false)
    })
    expect(mockedClient.getMeasurements).toHaveBeenCalledTimes(1)

    act(() => {
        window.dispatchEvent(new Event("focus"))
    })

    await waitFor(() => {
        expect(mockedClient.getMeasurements).toHaveBeenCalledTimes(2)
    })
})

test("only refreshes on visibilitychange when document is visible", async () => {
    mockedClient.getMeasurements.mockResolvedValue(measurement)

    const { result } = renderHook(() => useCurrentMetrics())

    await waitFor(() => {
        expect(result.current.loading).toBe(false)
    })
    expect(mockedClient.getMeasurements).toHaveBeenCalledTimes(1)

    Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "hidden",
    })

    act(() => {
        document.dispatchEvent(new Event("visibilitychange"))
    })

    expect(mockedClient.getMeasurements).toHaveBeenCalledTimes(1)

    Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "visible",
    })

    act(() => {
        document.dispatchEvent(new Event("visibilitychange"))
    })

    await waitFor(() => {
        expect(mockedClient.getMeasurements).toHaveBeenCalledTimes(2)
    })
})

test("deduplicates overlapping polling and foreground refresh calls", async () => {
    const firstRequest = deferred<MeasurementDto>()
    mockedClient.getMeasurements
        .mockReturnValueOnce(firstRequest.promise)
        .mockResolvedValue(measurement)

    renderHook(() =>
        useCurrentMetrics({
            intervalMs: 100,
            degradedBackoffMs: 60000,
            timeoutMs: 8000,
            retryCount: 0,
            degradedThreshold: 3,
        }),
    )

    expect(mockedClient.getMeasurements).toHaveBeenCalledTimes(1)

    act(() => {
        window.dispatchEvent(new Event("focus"))
    })

    act(() => {
        jest.advanceTimersByTime(100)
    })

    expect(mockedClient.getMeasurements).toHaveBeenCalledTimes(1)

    await act(async () => {
        firstRequest.resolve(measurement)
        await firstRequest.promise
    })

    await act(async () => {
        jest.advanceTimersByTime(100)
    })

    await waitFor(() => {
        expect(mockedClient.getMeasurements).toHaveBeenCalledTimes(2)
    })
})

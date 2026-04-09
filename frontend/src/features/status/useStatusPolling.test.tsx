import { useStatusPolling } from "@/features/status/useStatusPolling"
import { client } from "@/shared/api/client"
import { renderHook, waitFor } from "@testing-library/react"


jest.mock("../../shared/api/client", () => ({
  client: {
    getHealth: jest.fn(),
    getQueue: jest.fn(),
  },
  ApiError: class extends Error { },
}))

const mockedClient = client as jest.Mocked<typeof client>

beforeEach(() => {
  jest.useFakeTimers()
  mockedClient.getHealth.mockReset()
  mockedClient.getQueue.mockReset()
})

afterEach(() => {
  jest.useRealTimers()
})

test("maps status to ok/warn/error", async () => {
  mockedClient.getHealth.mockResolvedValue({ status: "healthy", timestamp: "", sensor: "connected" })
  mockedClient.getQueue.mockResolvedValue({ queue_size: 0, retry_queue_size: 0, circuit_breaker_state: 0, workers: 2, timestamp: "" })

  const { result } = renderHook(() => useStatusPolling())

  await waitFor(() => {
    expect(result.current.loading).toBe(false)
  })

  expect(result.current.status.level).toBe("ok")
  expect(result.current.status.sensorLevel).toBe("ok")
  expect(result.current.status.queueLevel).toBe("ok")
})

test("keeps updating available indicators when one endpoint fails", async () => {
  mockedClient.getHealth.mockRejectedValue(new Error("health down"))
  mockedClient.getQueue.mockResolvedValue({ queue_size: 3, retry_queue_size: 1, circuit_breaker_state: 0, workers: 2, timestamp: "" })

  const { result } = renderHook(() => useStatusPolling())

  await waitFor(() => {
    expect(result.current.loading).toBe(false)
  })

  expect(result.current.status.sensorLevel).toBe("error")
  expect(result.current.status.queueLevel).toBe("warn")
  expect(result.current.status.level).toBe("error")
  expect(result.current.status.queueSize).toBe(3)
  expect(result.current.status.retryQueueSize).toBe(1)
})

test("returns immediate error status when both endpoints are unavailable", async () => {
  mockedClient.getHealth.mockRejectedValue(new Error("boom"))
  mockedClient.getQueue.mockRejectedValue(new Error("boom"))

  const { result } = renderHook(() =>
    useStatusPolling({
      intervalMs: 100,
      timeoutMs: 50,
      retryCount: 0,
      degradedBackoffMs: 1000,
      degradedThreshold: 3,
    }),
  )

  await waitFor(() => {
    expect(result.current.loading).toBe(false)
  })

  expect(result.current.status.isDegraded).toBe(false)
  expect(result.current.status.level).toBe("error")
  expect(result.current.status.sensorLevel).toBe("error")
  expect(result.current.status.queueLevel).toBe("error")
  expect(result.current.status.message).toBe("Não foi possível conectar a estação")
  expect(result.current.intervalMs).toBe(100)
})

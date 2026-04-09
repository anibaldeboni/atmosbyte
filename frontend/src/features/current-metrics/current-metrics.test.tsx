import { useCurrentMetrics } from "@/features/current-metrics/useCurrentMetrics"
import type { CurrentMetricsState, MetricsError } from "@/features/current-metrics/useCurrentMetrics"
import { HomePage } from "@/pages/HomePage"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"

jest.mock("./useCurrentMetrics", () => ({
  useCurrentMetrics: jest.fn(),
}))

const mockedUseCurrentMetrics = useCurrentMetrics as jest.MockedFunction<typeof useCurrentMetrics>

function createMetricsError(message: string, isDegraded = false): MetricsError {
  return {
    name: "MetricsError",
    message,
    isDegraded,
    sourceKind: "network",
  } as MetricsError
}

function createMetricsState(overrides: Partial<CurrentMetricsState> = {}): CurrentMetricsState {
  return {
    data: null,
    loading: false,
    error: null,
    refresh: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

beforeEach(() => {
  mockedUseCurrentMetrics.mockReset()
})

test("loading to success replaces skeleton", async () => {
  mockedUseCurrentMetrics.mockReturnValue(createMetricsState({
    loading: true,
  }))

  const { rerender } = render(<HomePage />)

  expect(screen.getByTestId("metrics-skeleton-grid")).toBeInTheDocument()

  mockedUseCurrentMetrics.mockReturnValue(createMetricsState({
    data: {
      timestamp: "2026-03-17T00:00:00Z",
      temperature: 25,
      humidity: 60,
      pressure: 100900,
      source: "BME280",
    },
  }))

  rerender(<HomePage />)

  await waitFor(() => {
    expect(screen.getByText("25.0")).toBeInTheDocument()
    expect(screen.getByText("°C")).toBeInTheDocument()
  })
})

test("retains last successful values during transient errors", async () => {
  mockedUseCurrentMetrics.mockReturnValue(createMetricsState({
    data: {
      timestamp: "2026-03-17T00:00:00Z",
      temperature: 21,
      humidity: 50,
      pressure: 100800,
      source: "BME280",
    },
    error: createMetricsError("Falha temporária na atualização"),
  }))

  render(<HomePage />)

  expect(screen.getByText("21.0")).toBeInTheDocument()
  expect(screen.getByText("°C")).toBeInTheDocument()
  expect(screen.getByText("Falha temporária na atualização")).toBeInTheDocument()
})

test("shows degraded notice and 60s interval after 3 failed cycles then recovers", async () => {
  mockedUseCurrentMetrics
    .mockReturnValueOnce(createMetricsState({
      data: {
        timestamp: "2026-03-17T00:00:00Z",
        temperature: 20,
        humidity: 40,
        pressure: 100700,
        source: "BME280",
      },
      error: createMetricsError("Conexão degradada. Intervalo de polling alterado para 60s.", true),
    }))
    .mockReturnValueOnce(createMetricsState({
      data: {
        timestamp: "2026-03-17T00:03:00Z",
        temperature: 22,
        humidity: 45,
        pressure: 100710,
        source: "BME280",
      },
    }))

  const { rerender } = render(<HomePage />)

  await waitFor(() => {
    expect(screen.getByText("20.0")).toBeInTheDocument()
    expect(screen.getByText("°C")).toBeInTheDocument()
    expect(screen.getByText(/Conexão degradada/)).toBeInTheDocument()
    expect(screen.getByText(/60s/)).toBeInTheDocument()
  })

  rerender(<HomePage />)

  await waitFor(() => {
    expect(screen.queryByText(/Conexão degradada/)).not.toBeInTheDocument()
    expect(screen.getByText("22.0")).toBeInTheDocument()
    expect(screen.getByText("°C")).toBeInTheDocument()
  })
})

test("clicking refresh button calls hook refresh", () => {
  const refresh = jest.fn().mockResolvedValue(undefined)

  mockedUseCurrentMetrics.mockReturnValue(createMetricsState({
    data: {
      timestamp: "2026-03-17T00:00:00Z",
      temperature: 25,
      humidity: 60,
      pressure: 100900,
      source: "BME280",
    },
    refresh,
  }))

  render(<HomePage />)

  fireEvent.click(screen.getByRole("button", { name: "Atualizar dados" }))

  expect(refresh).toHaveBeenCalledTimes(1)
})

test("shows last updated timestamp label using local browser format", () => {
  const timestamp = "2026-03-17T00:00:00Z"
  const formatted = new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(timestamp))

  mockedUseCurrentMetrics.mockReturnValue(createMetricsState({
    data: {
      timestamp,
      temperature: 25,
      humidity: 60,
      pressure: 100900,
      source: "BME280",
    },
  }))

  render(<HomePage />)

  expect(screen.getByText(`Atualizado em ${formatted}`)).toBeInTheDocument()
})

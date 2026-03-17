import { render, screen, waitFor } from "@testing-library/react"

import { client } from "../../shared/api/client"
import { HomePage } from "../../pages/HomePage"
import { useCurrentMetrics } from "./useCurrentMetrics"

jest.mock("../../shared/api/client", () => ({
  client: {
    getMeasurements: jest.fn(),
    getHealth: jest.fn(),
    getQueue: jest.fn(),
  },
  ApiError: class extends Error {},
}))

const mockedClient = client as jest.Mocked<typeof client>

jest.mock("./useCurrentMetrics", () => ({
  useCurrentMetrics: jest.fn(),
}))

const mockedUseCurrentMetrics = useCurrentMetrics as jest.MockedFunction<typeof useCurrentMetrics>

beforeEach(() => {
  mockedUseCurrentMetrics.mockReset()
  mockedClient.getMeasurements.mockReset()
})

test("loading to success replaces skeleton", async () => {
  mockedUseCurrentMetrics.mockReturnValue({
    data: null,
    loading: true,
    error: null,
    degraded: false,
    intervalMs: 30000,
  })

  const { rerender } = render(<HomePage />)

  expect(screen.getByTestId("metrics-skeleton-grid")).toBeInTheDocument()

  mockedUseCurrentMetrics.mockReturnValue({
    data: {
      timestamp: "2026-03-17T00:00:00Z",
      temperature: 25,
      humidity: 60,
      pressure: 100900,
      source: "BME280",
    },
    loading: false,
    error: null,
    degraded: false,
    intervalMs: 30000,
  })

  rerender(<HomePage />)

  await waitFor(() => {
    expect(screen.getByText("25.0")).toBeInTheDocument()
    expect(screen.getByText("C")).toBeInTheDocument()
  })
})

test("retains last successful values during transient errors", async () => {
  mockedUseCurrentMetrics.mockReturnValue({
    data: {
      timestamp: "2026-03-17T00:00:00Z",
      temperature: 21,
      humidity: 50,
      pressure: 100800,
      source: "BME280",
    },
    loading: false,
    error: "network",
    degraded: false,
    intervalMs: 30000,
  })

  render(<HomePage />)

  expect(screen.getByText("21.0")).toBeInTheDocument()
  expect(screen.getByText("C")).toBeInTheDocument()
  expect(screen.getByText("network")).toBeInTheDocument()
})

test("shows degraded notice and 60s interval after 3 failed cycles then recovers", async () => {
  mockedUseCurrentMetrics
    .mockReturnValueOnce({
      data: {
        timestamp: "2026-03-17T00:00:00Z",
        temperature: 20,
        humidity: 40,
        pressure: 100700,
        source: "BME280",
      },
      loading: false,
      error: null,
      degraded: true,
      intervalMs: 60000,
    })
    .mockReturnValueOnce({
      data: {
        timestamp: "2026-03-17T00:03:00Z",
        temperature: 22,
        humidity: 45,
        pressure: 100710,
        source: "BME280",
      },
      loading: false,
      error: null,
      degraded: false,
      intervalMs: 30000,
    })

  const { rerender } = render(<HomePage />)

  await waitFor(() => {
    expect(screen.getByText("20.0")).toBeInTheDocument()
    expect(screen.getByText("C")).toBeInTheDocument()
    expect(screen.getByText(/Connection is degraded/)).toBeInTheDocument()
    expect(screen.getByText(/60s/)).toBeInTheDocument()
  })

  rerender(<HomePage />)

  await waitFor(() => {
    expect(screen.queryByText(/Connection is degraded/)).not.toBeInTheDocument()
    expect(screen.getByText("22.0")).toBeInTheDocument()
    expect(screen.getByText("C")).toBeInTheDocument()
  })
})

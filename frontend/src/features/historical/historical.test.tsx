import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { client } from "../../shared/api/client"
import { HistoricalPage } from "../../pages/HistoricalPage"

jest.mock("../../shared/api/client", () => ({
  client: {
    getHistorical: jest.fn(),
    getHealth: jest.fn(),
    getQueue: jest.fn(),
  },
  ApiError: class extends Error {},
}))

const mockedClient = client as jest.Mocked<typeof client>

beforeEach(() => {
  mockedClient.getHistorical.mockReset()
  mockedClient.getHealth.mockResolvedValue({ status: "healthy", timestamp: "", sensor: "connected" })
  mockedClient.getQueue.mockResolvedValue({ queue_size: 0, retry_queue_size: 0, circuit_breaker_state: 0, workers: 2, timestamp: "" })
  Object.defineProperty(window, "location", {
    value: {
      assign: jest.fn(),
    },
    writable: true,
  })
})

test("validates from <= to before querying", async () => {
  mockedClient.getHistorical.mockResolvedValue([])
  render(<HistoricalPage />)

  await waitFor(() => {
    expect(mockedClient.getHistorical).toHaveBeenCalledTimes(1)
  })

  const fromInput = screen.getByLabelText("De")
  const toInput = screen.getByLabelText("Até")

  fireEvent.change(fromInput, { target: { value: "2026-03-18T10:00" } })
  fireEvent.change(toInput, { target: { value: "2026-03-17T10:00" } })

  fireEvent.click(screen.getByRole("button", { name: "Carregar" }))

  expect(await screen.findByText("From date must be before or equal to To date.")).toBeInTheDocument()
  expect(mockedClient.getHistorical).toHaveBeenCalledTimes(1)
})

test("serializes query and preserves prior chart data on error", async () => {
  mockedClient.getHistorical
    .mockResolvedValueOnce([
      {
        type: "hour",
        date: 1710633600,
        temp: { min: 21, average: 22, max: 24 },
        humidity: { min: 51, average: 52, max: 53 },
        pressure: { min: 100000, average: 100100, max: 100200 },
      },
    ])
    .mockRejectedValueOnce(new Error("boom"))

  render(<HistoricalPage />)

  await waitFor(() => {
    expect(mockedClient.getHistorical).toHaveBeenCalledTimes(1)
  })

  fireEvent.click(screen.getByRole("button", { name: "Carregar" }))

  await waitFor(() => {
    expect(mockedClient.getHistorical).toHaveBeenCalledTimes(2)
    expect(screen.getByText(/HTTP|Failed to load historical data|network|boom/i)).toBeInTheDocument()
  })
})

test("exports CSV with current filters", async () => {
  mockedClient.getHistorical.mockResolvedValue([])
  render(<HistoricalPage />)

  await waitFor(() => {
    expect(mockedClient.getHistorical).toHaveBeenCalledTimes(1)
  })

  fireEvent.click(screen.getByRole("button", { name: "Exportar CSV" }))

  expect(window.location.assign).toHaveBeenCalled()
  const firstCall = (window.location.assign as jest.Mock).mock.calls[0][0] as string
  expect(firstCall).toContain("/data/export?")
  expect(firstCall).toContain("from=")
  expect(firstCall).toContain("to=")
  expect(firstCall).toContain("type=")
})

test("auto loads historical data on page mount", async () => {
  mockedClient.getHistorical.mockResolvedValue([])

  render(<HistoricalPage />)

  await waitFor(() => {
    expect(mockedClient.getHistorical).toHaveBeenCalledTimes(1)
  })
})

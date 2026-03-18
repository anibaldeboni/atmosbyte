import React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { client } from "../../shared/api/client"
import { HistoricalPage } from "../../pages/HistoricalPage"

jest.mock("react-datepicker", () => {
  return function MockDatePicker(props: {
    selected?: Date | null
    onChange?: (date: Date | null) => void
    customInput: React.ReactElement<{ onClick?: () => void; value?: string }>
    onInputClick?: () => void
    open?: boolean
  }) {
    const value = props.selected instanceof Date && !Number.isNaN(props.selected.getTime())
      ? `${props.selected.getFullYear()}-${String(props.selected.getMonth() + 1).padStart(2, "0")}-${String(props.selected.getDate()).padStart(2, "0")}T${String(props.selected.getHours()).padStart(2, "0")}:${String(props.selected.getMinutes()).padStart(2, "0")}`
      : ""

    const input = props.customInput
    const mergedOnClick = () => {
      props.onInputClick?.()
      input.props.onClick?.()
    }

    return (
      <>
        {React.cloneElement(input, {
          value,
          onClick: mergedOnClick,
          onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
            props.onChange?.(new Date(event.target.value))
          },
        })}
        {props.open ? <div className="react-datepicker" data-testid="datepicker-popup" /> : null}
      </>
    )
  }
})

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

  const firstQuery = mockedClient.getHistorical.mock.calls[0][0]
  expect(firstQuery.from).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00.000Z$/)
  expect(firstQuery.to).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00.000Z$/)
  expect(firstQuery.type).toMatch(/^(m|h|d)$/)

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
  const parsed = new URL(firstCall, "http://localhost")
  expect(parsed.searchParams.get("from")).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00.000Z$/)
  expect(parsed.searchParams.get("to")).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00.000Z$/)
})

test("renders clickable right-side calendar icons for both datetime fields", async () => {
  mockedClient.getHistorical.mockResolvedValue([])
  render(<HistoricalPage />)

  await waitFor(() => {
    expect(mockedClient.getHistorical).toHaveBeenCalledTimes(1)
  })

  expect(screen.getByRole("button", { name: "Abrir calendário De" })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Abrir calendário Até" })).toBeInTheDocument()
})

test("opens picker when calendar icon is clicked", async () => {
  mockedClient.getHistorical.mockResolvedValue([])
  render(<HistoricalPage />)

  await waitFor(() => {
    expect(mockedClient.getHistorical).toHaveBeenCalledTimes(1)
  })

  fireEvent.click(screen.getByRole("button", { name: "Abrir calendário De" }))

  expect(screen.getByTestId("datepicker-popup")).toBeInTheDocument()
})

test("auto loads historical data on page mount", async () => {
  mockedClient.getHistorical.mockResolvedValue([])

  render(<HistoricalPage />)

  await waitFor(() => {
    expect(mockedClient.getHistorical).toHaveBeenCalledTimes(1)
  })
})

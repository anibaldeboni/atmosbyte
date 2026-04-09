import { HistoricalPage } from "@/pages/HistoricalPage"
import { client } from "@/shared/api/client"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { parseISO } from "date-fns"
import React from "react"


jest.mock("../../features/historical/HistoricalCharts", () => ({
  HistoricalCharts: ({ data, error, loading }: { data: Array<unknown>; error: Error | null; loading: boolean }) => (
    <div data-testid="historical-charts-mock">
      <span>{loading ? "loading" : "ready"}</span>
      <span>{`count:${data.length}`}</span>
      {error ? <span>{error.message}</span> : null}
    </div>
  ),
}))

jest.mock("react-datepicker", () => {
  return function MockDatePicker(props: {
    selected?: Date | null
    onChange?: (date: Date | null) => void
    onChangeRaw?: (event: React.ChangeEvent<HTMLInputElement>) => void
    showTimeSelect?: boolean
    timeIntervals?: number
    maxDate?: Date
    customInput: React.ReactElement<{ onClick?: () => void; value?: string }>
    onInputClick?: () => void
    open?: boolean
    value?: string
  }) {
    const selectedValue = props.selected instanceof Date && !Number.isNaN(props.selected.getTime())
      ? `${props.selected.getFullYear()}-${String(props.selected.getMonth() + 1).padStart(2, "0")}-${String(props.selected.getDate()).padStart(2, "0")}T${String(props.selected.getHours()).padStart(2, "0")}:${String(props.selected.getMinutes()).padStart(2, "0")}`
      : ""
    const value = props.value ?? selectedValue

    const input = props.customInput
    const mergedOnClick = () => {
      props.onInputClick?.()
      input.props.onClick?.()
    }

    return (
      <>
        {React.cloneElement(input, {
          value,
          "data-show-time-select": props.showTimeSelect ? "true" : "false",
          "data-time-intervals": String(props.timeIntervals ?? ""),
          "data-has-max-date": props.maxDate instanceof Date ? "true" : "false",
          onClick: mergedOnClick,
          onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
            props.onChangeRaw?.(event)
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
  ApiError: class extends Error { },
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

  expect(await screen.findByText("A data de início deve ser anterior ou igual à data de término.")).toBeInTheDocument()
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

test("uses 1-minute intervals for minute granularity", async () => {
  mockedClient.getHistorical.mockResolvedValue([])
  render(<HistoricalPage />)

  await waitFor(() => {
    expect(mockedClient.getHistorical).toHaveBeenCalledTimes(1)
  })

  fireEvent.change(screen.getByLabelText("Granularidade"), { target: { value: "m" } })

  expect(screen.getByLabelText("De")).toHaveAttribute("data-time-intervals", "1")
  expect(screen.getByLabelText("Até")).toHaveAttribute("data-time-intervals", "1")
  expect(screen.getByLabelText("De")).toHaveAttribute("data-show-time-select", "true")
  expect(screen.getByLabelText("Até")).toHaveAttribute("data-show-time-select", "true")

  fireEvent.click(screen.getByRole("button", { name: "Carregar" }))

  await waitFor(() => {
    expect(mockedClient.getHistorical).toHaveBeenCalledTimes(2)
  })

  const secondQuery = mockedClient.getHistorical.mock.calls[1][0]
  const fromIso = parseISO(secondQuery.from)
  const toIso = parseISO(secondQuery.to)
  const diffMs = toIso.getTime() - fromIso.getTime()

  expect(toIso.getUTCMinutes()).toBe(0)
  expect(fromIso.getUTCMinutes()).toBe(0)
  expect(diffMs).toBe(60 * 60 * 1000)
})

test("uses 1-hour intervals for hourly granularity", async () => {
  mockedClient.getHistorical.mockResolvedValue([])
  render(<HistoricalPage />)

  await waitFor(() => {
    expect(mockedClient.getHistorical).toHaveBeenCalledTimes(1)
  })

  fireEvent.change(screen.getByLabelText("Granularidade"), { target: { value: "h" } })

  expect(screen.getByLabelText("De")).toHaveAttribute("data-time-intervals", "60")
  expect(screen.getByLabelText("Até")).toHaveAttribute("data-time-intervals", "60")
  expect(screen.getByLabelText("De")).toHaveAttribute("data-show-time-select", "true")
  expect(screen.getByLabelText("Até")).toHaveAttribute("data-show-time-select", "true")

  fireEvent.click(screen.getByRole("button", { name: "Carregar" }))

  await waitFor(() => {
    expect(mockedClient.getHistorical).toHaveBeenCalledTimes(2)
  })

  const secondQuery = mockedClient.getHistorical.mock.calls[1][0]
  const fromIso = parseISO(secondQuery.from)
  const toIso = parseISO(secondQuery.to)
  const diffMs = toIso.getTime() - fromIso.getTime()

  expect(toIso.getUTCMinutes()).toBe(0)
  expect(fromIso.getUTCMinutes()).toBe(0)
  expect(diffMs).toBe(24 * 60 * 60 * 1000)
})

test("hides time selection and resets range to one month for daily granularity", async () => {
  mockedClient.getHistorical.mockResolvedValue([])
  render(<HistoricalPage />)

  await waitFor(() => {
    expect(mockedClient.getHistorical).toHaveBeenCalledTimes(1)
  })

  fireEvent.change(screen.getByLabelText("Granularidade"), { target: { value: "d" } })
  fireEvent.click(screen.getByRole("button", { name: "Carregar" }))

  await waitFor(() => {
    expect(mockedClient.getHistorical).toHaveBeenCalledTimes(2)
  })

  const secondQuery = mockedClient.getHistorical.mock.calls[1][0]
  const fromIso = parseISO(secondQuery.from)
  const toIso = parseISO(secondQuery.to)

  expect(screen.getByLabelText("De")).toHaveAttribute("data-show-time-select", "false")
  expect(screen.getByLabelText("Até")).toHaveAttribute("data-show-time-select", "false")
  expect(toIso.getUTCMinutes()).toBe(0)
  expect(fromIso.getUTCMinutes()).toBe(0)
  expect(toIso.getUTCMonth() - fromIso.getUTCMonth() + (toIso.getUTCFullYear() - fromIso.getUTCFullYear()) * 12).toBe(1)
  expect(toIso.getUTCDate()).toBe(fromIso.getUTCDate())
  expect(toIso.getUTCHours()).toBe(fromIso.getUTCHours())
})

test("rejects future date values before querying", async () => {
  mockedClient.getHistorical.mockResolvedValue([])
  render(<HistoricalPage />)

  await waitFor(() => {
    expect(mockedClient.getHistorical).toHaveBeenCalledTimes(1)
  })

  fireEvent.change(screen.getByLabelText("De"), { target: { value: "2999-01-01T00:00" } })
  fireEvent.change(screen.getByLabelText("Até"), { target: { value: "2999-01-01T01:00" } })
  fireEvent.click(screen.getByRole("button", { name: "Carregar" }))

  expect(await screen.findByText("Os valores de data não podem estar no futuro.")).toBeInTheDocument()
  expect(mockedClient.getHistorical).toHaveBeenCalledTimes(1)
})

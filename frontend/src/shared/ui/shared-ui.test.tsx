import { act, fireEvent, render, screen } from "@testing-library/react"

import { ChartCard } from "./ChartCard"
import { EmptyState } from "./EmptyState"
import { InlineAlert } from "./InlineAlert"
import { MetricCard } from "./MetricCard"
import { Toast } from "./Toast"

test("metric card renders label and value", () => {
  render(<MetricCard label="Temperature" value="20 C" helper="source" icon={<svg data-testid="metric-icon" />} />)
  expect(screen.getByText("Temperature")).toBeInTheDocument()
  expect(screen.getByText("20")).toBeInTheDocument()
  expect(screen.getByText("C")).toBeInTheDocument()
  expect(screen.getByText("source")).toBeInTheDocument()
  expect(screen.getByTestId("metric-icon")).toBeInTheDocument()
})

test("chart card renders title and children", () => {
  render(
    <ChartCard title="Trend" subtitle="Min/Avg/Max">
      <span>chart</span>
    </ChartCard>,
  )
  expect(screen.getByText("Trend")).toBeInTheDocument()
  expect(screen.getByText("Min/Avg/Max")).toBeInTheDocument()
  expect(screen.getByText("chart")).toBeInTheDocument()
})

test("inline alert renders content", () => {
  render(<InlineAlert tone="warn">warning</InlineAlert>)
  expect(screen.getByText("warning")).toBeInTheDocument()
})

test("empty state renders title and description", () => {
  render(<EmptyState title="No data" description="Try again" />)
  expect(screen.getByText("No data")).toBeInTheDocument()
  expect(screen.getByText("Try again")).toBeInTheDocument()
})

test("toast renders title and message", () => {
  jest.useFakeTimers()
  render(
    <Toast tone="error" title="Erro de status">
      Falha de conexao
    </Toast>,
  )
  expect(screen.getByRole("alert")).toBeInTheDocument()
  expect(screen.getByText("Erro de status")).toBeInTheDocument()
  expect(screen.getByText("Falha de conexao")).toBeInTheDocument()

  act(() => {
    jest.advanceTimersByTime(5100)
  })
  expect(screen.getByRole("alert")).toBeInTheDocument()

  jest.useRealTimers()
})

test("toast pauses auto-dismiss while hovered", () => {
  jest.useFakeTimers()

  render(
    <Toast tone="warn" title="Alerta" autoHideMs={5000}>
      Mensagem
    </Toast>,
  )

  const alert = screen.getByRole("alert")

  act(() => {
    jest.advanceTimersByTime(2000)
  })

  fireEvent.mouseEnter(alert)

  act(() => {
    jest.advanceTimersByTime(4000)
  })

  expect(alert.parentElement).toHaveClass("opacity-100")

  fireEvent.mouseLeave(alert)

  act(() => {
    jest.advanceTimersByTime(3200)
  })

  expect(alert.parentElement).toHaveClass("opacity-0")

  jest.useRealTimers()
})

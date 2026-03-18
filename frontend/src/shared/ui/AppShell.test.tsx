import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"

import { ThemeProvider } from "../../app/theme/ThemeProvider"
import { AppShell } from "./AppShell"

jest.mock("../../features/status/StatusStrip")

function renderShell(): void {
  render(
    <ThemeProvider>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route index element={<div>home</div>} />
            <Route path="historical" element={<div>historical</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  )
}

beforeEach(() => {
  window.localStorage.clear()
  document.documentElement.dataset.theme = "light"
})

test("theme toggle renders inside primary navigation", () => {
  renderShell()

  const nav = screen.getByRole("navigation", { name: "Primary" })
  const toggle = within(nav).getByRole("button")
  const links = within(nav).getAllByRole("link")

  expect(links).toHaveLength(2)
  expect(nav.contains(toggle)).toBe(true)
  expect(nav.lastElementChild).toBe(toggle)
})

test("theme toggle updates aria-label and aria-pressed", async () => {
  const user = userEvent.setup()
  renderShell()

  const toggle = screen.getByRole("button", { name: "Ativar modo escuro" })
  expect(toggle).toHaveAttribute("aria-pressed", "false")

  await user.click(toggle)

  const toggled = screen.getByRole("button", { name: "Ativar modo claro" })
  expect(toggled).toHaveAttribute("aria-pressed", "true")
})

test("theme toggle can be activated by keyboard", async () => {
  const user = userEvent.setup()
  renderShell()

  const toggle = screen.getByRole("button", { name: "Ativar modo escuro" })
  toggle.focus()
  await user.keyboard("{Enter}")

  expect(screen.getByRole("button", { name: "Ativar modo claro" })).toBeInTheDocument()
  expect(document.documentElement.dataset.theme).toBe("dark")
})

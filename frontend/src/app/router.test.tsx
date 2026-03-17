import { render, screen } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router-dom"

import { AppProviders } from "./AppProviders"
import { routes } from "./router"

function renderRoute(path: string): void {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>,
  )
}

test("router renders home route", async () => {
  renderRoute("/")
  expect(await screen.findByRole("heading", { name: "Visão geral do tempo atual" })).toBeInTheDocument()
  expect(screen.getByRole("link", { name: "Início" })).toHaveClass("app-shell-nav-link-active")
})

test("router renders historical route", async () => {
  renderRoute("/historical")
  expect(await screen.findByRole("heading", { name: "Análise do Histórico Meteorológico" })).toBeInTheDocument()
  expect(screen.getByRole("link", { name: "Histórico" })).toHaveClass("app-shell-nav-link-active")
})

test("router renders not found route", () => {
  renderRoute("/missing")
  expect(screen.getByRole("heading", { name: "Página não encontrada" })).toBeInTheDocument()
})

import { useTheme } from "@/app/theme/ThemeProvider"
import { StatusStrip } from "@/features/status/StatusStrip"
import { AtmosbyteIcon } from "@/shared/ui/icons/app"
import { HalfMoonIcon, SunIcon } from "@/shared/ui/icons/theme"
import { cn } from "@/shared/ui/cn"
import React from "react"
import { NavLink, Outlet } from "react-router-dom"


function linkClass(isActive: boolean): string {
  return cn(
    "app-shell-nav-link app-shell-nav-link-size whitespace-nowrap rounded-md px-2 py-2 font-bold md:px-3",
    isActive && "app-shell-nav-link-active",
  )
}

interface ThemeToggleButtonProps {
  theme: "dark" | "light"
  toggleFn: () => void
}

function ThemeToggleButton({ theme, toggleFn }: ThemeToggleButtonProps): React.JSX.Element {
  const toggleLabel = theme === "light" ? "Ativar modo escuro" : "Ativar modo claro"
  return (
    <button
      type="button"
      className="app-shell-theme-toggle inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
      onClick={toggleFn}
      aria-label={toggleLabel}
      aria-pressed={theme === "dark"}
    >
      {theme === "light" ? (
        <HalfMoonIcon className="app-shell-theme-icon-size" aria-hidden="true" />
      ) : (
        <SunIcon className="app-shell-theme-icon-size" aria-hidden="true" />
      )}
    </button>
  )
}

export function AppShell(): React.JSX.Element {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="app-shell min-h-screen bg-gradient-to-b">
      <header className="app-shell-header border-b backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="app-shell-brand-icon app-shell-brand-icon-size inline-flex items-center justify-center" aria-hidden="true">
              <AtmosbyteIcon className="app-shell-brand-icon-size" />
            </span>
            <div>
              <h1 className="app-shell-title font-extrabold leading-none tracking-[-0.03em]">Atmosbyte</h1>
              <p className="app-shell-tagline app-shell-tagline-size hidden font-medium tracking-[0.01em] md:block">
                Sistema de monitoramento meteorológico em tempo real
              </p>
            </div>
          </div>
          <nav className="flex w-full items-center gap-2 overflow-x-auto md:w-auto md:gap-3" aria-label="Primary">
            <NavLink to="/" end className={({ isActive }) => linkClass(isActive)}>
              Início
            </NavLink>
            <NavLink to="/historical" className={({ isActive }) => linkClass(isActive)}>
              Histórico
            </NavLink>
            <ThemeToggleButton theme={theme} toggleFn={toggleTheme} />
          </nav>
        </div>
      </header>
      <StatusStrip />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}

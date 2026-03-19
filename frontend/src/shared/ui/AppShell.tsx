import { NavLink, Outlet } from "react-router-dom"

import { useTheme } from "../../app/theme/ThemeProvider"
import { StatusStrip } from "../../features/status/StatusStrip"
import { cn } from "./cn"
import React from "react"

function linkClass(isActive: boolean): string {
  return cn(
    "app-shell-nav-link app-shell-nav-link-size whitespace-nowrap rounded-md px-2 py-2 font-bold md:px-3",
    isActive && "app-shell-nav-link-active",
  )
}

function AtmosbyteIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="app-shell-brand-icon-size" fill="none" role="img">
      <path
        d="M7.8 16.8h9.2a3.5 3.5 0 0 0 .3-7 5.2 5.2 0 0 0-9.9 1.7A3.2 3.2 0 0 0 7.8 16.8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4 19h8M11 21h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function HalfMoonIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="app-shell-theme-icon-size" fill="none" aria-hidden="true">
      <path d="M15.5 4.5a7.5 7.5 0 1 0 4 14 8.2 8.2 0 1 1-4-14Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SunIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="app-shell-theme-icon-size" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2.5v2.1M12 19.4v2.1M4.8 4.8l1.5 1.5M17.7 17.7l1.5 1.5M2.5 12h2.1M19.4 12h2.1M4.8 19.2l1.5-1.5M17.7 6.3l1.5-1.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
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
        <HalfMoonIcon />
      ) : (
        <SunIcon />
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
              <AtmosbyteIcon />
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

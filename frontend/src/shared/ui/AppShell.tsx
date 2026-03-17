import { NavLink, Outlet } from "react-router-dom"

import { useTheme } from "../../app/theme/ThemeProvider"
import { StatusStrip } from "../../features/status/StatusStrip"

function linkClass(isActive: boolean): string {
  return isActive
    ? "app-shell-nav-link app-shell-nav-link-active whitespace-nowrap rounded-md px-2 py-2 text-sm font-bold md:px-3 md:text-[15px]"
    : "app-shell-nav-link whitespace-nowrap rounded-md px-2 py-2 text-sm font-bold md:px-3 md:text-[15px]"
}

export function AppShell(): React.JSX.Element {
  const { theme, toggleTheme } = useTheme()
  const toggleLabel = theme === "light" ? "Ativar modo escuro" : "Ativar modo claro"

  return (
    <div className="app-shell min-h-screen bg-gradient-to-b">
      <header className="app-shell-header border-b backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="app-shell-brand-icon inline-flex h-[34px] w-[34px] items-center justify-center" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-[34px] w-[34px]" fill="none" role="img">
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
                <path
                  d="M12 2.5v2.2M12 19.3v2.2M4.7 4.7l1.6 1.6M17.7 17.7l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.7 19.3l1.6-1.6M17.7 6.3l1.6-1.6"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <div>
              <h1 className="text-[38px] font-extrabold leading-none tracking-[-0.03em]">Atmosbyte</h1>
              <p className="app-shell-tagline hidden text-[15px] font-medium tracking-[0.01em] md:block">
                Sistema de monitoramento meteorológico em tempo real
              </p>
            </div>
          </div>
          <nav className="flex w-full items-center gap-2 overflow-x-auto md:w-auto md:gap-3" aria-label="Primary">
            <button
              type="button"
              className="app-shell-theme-toggle inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
              onClick={toggleTheme}
              aria-label={toggleLabel}
              aria-pressed={theme === "dark"}
            >
              {theme === "light" ? (
                <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" aria-hidden="true">
                  <path d="M15.5 4.5a7.5 7.5 0 1 0 4 14 8.2 8.2 0 1 1-4-14Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
                  <path
                    d="M12 2.5v2.1M12 19.4v2.1M4.8 4.8l1.5 1.5M17.7 17.7l1.5 1.5M2.5 12h2.1M19.4 12h2.1M4.8 19.2l1.5-1.5M17.7 6.3l1.5-1.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </button>
            <NavLink to="/" end className={({ isActive }) => linkClass(isActive)}>
              Início
            </NavLink>
            <NavLink to="/historical" className={({ isActive }) => linkClass(isActive)}>
              Histórico
            </NavLink>
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

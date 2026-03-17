import { NavLink, Outlet } from "react-router-dom"

import { StatusStrip } from "../../features/status/StatusStrip"

function linkClass(isActive: boolean): string {
  return isActive
    ? "whitespace-nowrap rounded-md px-2 py-2 text-sm font-bold text-[#0f7431] shadow-[inset_0_-2px_0_#0f7431] md:px-3 md:text-[15px]"
    : "whitespace-nowrap rounded-md px-2 py-2 text-sm font-bold text-[#3f4a57] hover:bg-slate-200 md:px-3 md:text-[15px]"
}

export function AppShell(): JSX.Element {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-white text-slate-900">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="inline-flex h-[34px] w-[34px] items-center justify-center text-[#1f5d2b]" aria-hidden="true">
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
              <p className="hidden text-[15px] font-medium tracking-[0.01em] text-[#5f6d7a] md:block">
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

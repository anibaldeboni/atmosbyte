import { useStatusPolling } from "./useStatusPolling"
import { Skeleton } from "../../shared/ui/Skeleton"
import { Tooltip } from "../../shared/ui/Tooltip"

function dotClass(level: "ok" | "warn" | "error"): string {
  if (level === "error") {
    return "status-icon-error"
  }
  if (level === "warn") {
    return "status-icon-warn"
  }
  return "status-icon-ok"
}

function ComputerIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" role="img">
      <rect x="3" y="4" width="18" height="14" rx="2" ry="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 20h8M12 16v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function ThermometerIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 24 24" fill="none" role="img">
      <path
        d="M14 14.76V5a2 2 0 1 0-4 0v9.76a4 4 0 1 0 4 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 11v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function ClockIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 4.7V8l2.3 1.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function QueueListIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 4.5h8M4 8h8M4 11.5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="2.2" cy="4.5" r="0.7" fill="currentColor" />
      <circle cx="2.2" cy="8" r="0.7" fill="currentColor" />
      <circle cx="2.2" cy="11.5" r="0.7" fill="currentColor" />
    </svg>
  )
}

function humanStatus(level: string): string {
  if (level === "error") {
    return "Indisponível"
  }
  if (level === "warn") {
    return "Degradado"
  }
  return "Operacional"
}

function fmtDateWithBrowserLocale(dateStr: number): string {
  const date = new Date(dateStr)
  const currentBrowserLocale = navigator.language || "en-US"
  const currentBrowserTimeFormat = new Intl.DateTimeFormat(currentBrowserLocale, { hour: "numeric" }).formatToParts(new Date()).find(part => part.type === "hour")?.value || "24"
  const hour12 = currentBrowserTimeFormat === "12"
  return date.toLocaleTimeString(currentBrowserLocale, { hour12 })
}

export function StatusStrip(): React.JSX.Element {
  const { status, loading } = useStatusPolling()
  const updatedLabel = fmtDateWithBrowserLocale(status.updatedAt)
  const systemLabel = humanStatus(status.level)
  const sensorLabel = humanStatus(status.sensorLevel)
  const queueLabel = `Fila: ${status.queueLevel == "error" ? "---" : status.queueSize}${status.retryQueueSize > 0 ? ` (${status.retryQueueSize} tentativas)` : ""}`

  if (loading) {
    return (
      <section className="status-strip border-b-2">
        <div className="mx-auto grid w-full max-w-5xl grid-cols-2 gap-x-3 gap-y-2 px-4 py-2 text-sm md:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="status-strip-skeleton h-5 w-full" />
          <Skeleton className="status-strip-skeleton h-5 w-full" />
          <Skeleton className="status-strip-skeleton h-5 w-full" />
          <Skeleton className="status-strip-skeleton h-5 w-full" />
        </div>
      </section>
    )
  }

  return (
    <section className="status-strip border-b-2">
      <div className="mx-auto grid w-full max-w-5xl grid-cols-2 gap-x-3 gap-y-2 px-4 py-2 text-[15px] md:grid-cols-2 xl:grid-cols-4">
        <Tooltip as="div" className="w-full" content="Comunicação com a estação meteorológica">
          <p className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
            <span className={`status-item-icon ${dotClass(status.level)}`} aria-hidden="true">
              <ComputerIcon />
            </span>
            <span>{systemLabel}</span>
          </p>
        </Tooltip>
        <Tooltip as="div" className="w-full" content="Leitura dos sensores">
          <p className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
            <span className={`status-item-icon ${dotClass(status.sensorLevel)}`} aria-hidden="true">
              <ThermometerIcon />
            </span>
            <span>{sensorLabel}</span>
          </p>
        </Tooltip>
        <Tooltip as="div" className="w-full" content="Última atualização">
          <p className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
            <span className="status-item-icon status-icon-clock" aria-hidden="true">
              <ClockIcon />
            </span>
            <span>{updatedLabel}</span>
          </p>
        </Tooltip>
        <Tooltip as="div" className="w-full" content="Leituras pendentes na fila de processamento">
          <p className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
            <span className={`status-item-icon ${dotClass(status.queueLevel)}`} aria-hidden="true">
              <QueueListIcon />
            </span>
            <span>{queueLabel}</span>
          </p>
        </Tooltip>
      </div>
    </section>
  )
}

import { useStatusPolling } from "./useStatusPolling"
import { Skeleton } from "../../shared/ui/Skeleton"
import { Toast } from "../../shared/ui/Toast"

function dotClass(level: "ok" | "warn" | "error"): string {
  if (level === "error") {
    return "status-icon-error"
  }
  if (level === "warn") {
    return "status-icon-warn"
  }
  return "status-icon-ok"
}

function CheckCircleIcon(): React.JSX.Element {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5.2 8.3 7.1 10.2 10.9 6.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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

export function StatusStrip(): React.JSX.Element {
  const { status, loading, error } = useStatusPolling()
  const updatedAt = new Date(status.updatedAt).toLocaleTimeString("pt-BR", { hour12: false })
  const hasCommunicationFailure = Boolean(error)
  const systemLabel =
    status.level === "error" ? "Sistema indisponivel" : status.level === "warn" ? "Sistema com degradacao" : "Sistema operacional"
  const sensorLabel =
    status.sensorLevel === "error" ? "Sensor indisponivel" : status.sensorLevel === "warn" ? "Sensor degradado" : "Sensor conectado"

  const toastTone: "warn" | "error" | null = error || status.level === "error" ? "error" : status.queueLevel === "warn" || status.level === "warn" ? "warn" : null
  const toastMessage = error
    ? `Ultimo erro: ${error}`
    : status.level === "error"
      ? status.message
      : status.queueLevel === "warn" || status.level === "warn"
        ? status.message
        : null

  if (loading) {
    return (
      <section className="status-strip border-b-2">
        <div className="mx-auto grid w-full max-w-[1480px] grid-cols-1 gap-x-3 gap-y-2 px-4 py-2 text-sm md:grid-cols-2 md:px-6 xl:grid-cols-4">
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
      <div className="mx-auto grid w-full max-w-[1480px] grid-cols-1 gap-x-3 gap-y-2 px-4 py-2 text-[15px] md:grid-cols-2 md:px-6 xl:grid-cols-4">
        <p className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
          <span className={`status-item-icon ${dotClass(status.level)}`} aria-hidden="true">
            <CheckCircleIcon />
          </span>
          <span>{systemLabel}</span>
        </p>
        <p className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
          <span className={`status-item-icon ${dotClass(status.sensorLevel)}`} aria-hidden="true">
            <CheckCircleIcon />
          </span>
          <span>{sensorLabel}</span>
        </p>
        <p className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
          <span className={`status-item-icon status-icon-clock ${hasCommunicationFailure ? "status-icon-clock-error" : ""}`} aria-hidden="true">
            <ClockIcon />
          </span>
          <span>Última atualização: {updatedAt}</span>
        </p>
        <p className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
          <span className={`status-item-icon ${dotClass(status.queueLevel)}`} aria-hidden="true">
            <QueueListIcon />
          </span>
          <span>
            Fila: {status.queueSize}
            {status.retryQueueSize > 0 ? ` (${status.retryQueueSize} retry)` : ""}
          </span>
        </p>
      </div>
      {toastTone && toastMessage ? <Toast tone={toastTone} title={toastTone === "error" ? "Erro de status" : "Alerta de status"}>{toastMessage}</Toast> : null}
    </section>
  )
}

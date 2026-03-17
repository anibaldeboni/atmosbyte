import { useStatusPolling } from "./useStatusPolling"
import { Skeleton } from "../../shared/ui/Skeleton"
import { Toast } from "../../shared/ui/Toast"

function dotClass(level: "ok" | "warn" | "error"): string {
  if (level === "error") {
    return "bg-red-500"
  }
  if (level === "warn") {
    return "bg-amber-400"
  }
  return "bg-green-400"
}

export function StatusStrip(): React.JSX.Element {
  const { status, loading, error } = useStatusPolling()
  const updatedAt = new Date(status.updatedAt).toLocaleTimeString("pt-BR", { hour12: false })
  const systemLabel =
    status.level === "error" ? "Sistema indisponivel" : status.level === "warn" ? "Sistema com degradacao" : "Sistema operacional"
  const sensorLabel = status.sensorLevel === "error" ? "Sensor indisponivel" : "Sensor conectado"

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
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotClass(status.level)}`} aria-hidden="true" />
          <span>{systemLabel}</span>
        </p>
        <p className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotClass(status.sensorLevel)}`} aria-hidden="true" />
          <span>{sensorLabel}</span>
        </p>
        <p className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-green-400" aria-hidden="true" />
          <span>Última atualização: {updatedAt}</span>
        </p>
        <p className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotClass(status.queueLevel)}`} aria-hidden="true" />
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

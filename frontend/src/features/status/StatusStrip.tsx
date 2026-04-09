import { humanStatus, statusIconToneClass } from "@/features/status/statusPresentation"
import { useStatusPolling } from "@/features/status/useStatusPolling"
import { ClockIcon, ComputerIcon, QueueListIcon, ThermometerIcon } from "@/shared/ui/icons/status"
import { cn } from "@/shared/ui/cn"
import { Skeleton } from "@/shared/ui/Skeleton"
import { Tooltip } from "@/shared/ui/Tooltip"


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
  const itemLayoutClass = "w-[calc(50%-0.375rem)] xl:w-auto xl:flex-none"
  const skeletonLayoutClass = "w-[calc(50%-0.375rem)] xl:w-[11.5rem]"

  if (loading) {
    return (
      <section className="status-strip border-b-2">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2 text-sm xl:gap-x-0">
          <Skeleton className={cn("status-strip-skeleton h-5", skeletonLayoutClass)} />
          <Skeleton className={cn("status-strip-skeleton h-5", skeletonLayoutClass)} />
          <Skeleton className={cn("status-strip-skeleton h-5", skeletonLayoutClass)} />
          <Skeleton className={cn("status-strip-skeleton h-5", skeletonLayoutClass)} />
        </div>
      </section>
    )
  }

  return (
    <section className="status-strip border-b-2">
      <div className="status-strip-text-size mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2 xl:gap-x-0">
        <Tooltip as="div" className={itemLayoutClass} content="Comunicação com a estação meteorológica">
          <p className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
            <span className={cn("status-item-icon", statusIconToneClass(status.level))} aria-hidden="true">
              <ComputerIcon />
            </span>
            <span>{systemLabel}</span>
          </p>
        </Tooltip>
        <Tooltip as="div" className={itemLayoutClass} content="Leitura dos sensores">
          <p className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
            <span className={cn("status-item-icon", statusIconToneClass(status.sensorLevel))} aria-hidden="true">
              <ThermometerIcon />
            </span>
            <span>{sensorLabel}</span>
          </p>
        </Tooltip>
        <Tooltip as="div" className={itemLayoutClass} content="Última atualização">
          <p className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
            <span className="status-item-icon status-icon-clock" aria-hidden="true">
              <ClockIcon />
            </span>
            <span>{updatedLabel}</span>
          </p>
        </Tooltip>
        <Tooltip as="div" className={itemLayoutClass} content="Leituras pendentes na fila de processamento">
          <p className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
            <span className={cn("status-item-icon", statusIconToneClass(status.queueLevel))} aria-hidden="true">
              <QueueListIcon />
            </span>
            <span>{queueLabel}</span>
          </p>
        </Tooltip>
      </div>
    </section>
  )
}

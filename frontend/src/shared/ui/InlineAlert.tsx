import type { PropsWithChildren } from "react"

interface InlineAlertProps extends PropsWithChildren {
  tone?: "info" | "warn" | "error"
}

export function InlineAlert({ children, tone = "info" }: InlineAlertProps): React.JSX.Element {
  const toneClass = tone === "error" ? "inline-alert-error" : tone === "warn" ? "inline-alert-warn" : "inline-alert-info"
  return <div className={`rounded-md border px-3 py-2 text-sm ${toneClass}`}>{children}</div>
}

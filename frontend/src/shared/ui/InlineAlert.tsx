import type { PropsWithChildren } from "react"

interface InlineAlertProps extends PropsWithChildren {
  tone?: "info" | "warn" | "error"
}

export function InlineAlert({ children, tone = "info" }: InlineAlertProps): React.JSX.Element {
  const toneClass = tone === "error" ? "border-red-200 bg-red-50 text-red-700" : tone === "warn" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-sky-200 bg-sky-50 text-sky-800"
  return <div className={`rounded-md border px-3 py-2 text-sm ${toneClass}`}>{children}</div>
}

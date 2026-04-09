import { alertToneClass, type AlertTone } from "@/shared/ui/alertTone"
import { cn } from "@/shared/ui/cn"
import type { PropsWithChildren } from "react"


interface InlineAlertProps extends PropsWithChildren {
  tone?: AlertTone
}

export function InlineAlert({ children, tone = "info" }: InlineAlertProps): React.JSX.Element {
  return <div className={cn("rounded-md border px-3 py-2 text-sm", alertToneClass(tone))}>{children}</div>
}

import type { PropsWithChildren } from "react"

import { alertToneClass, type AlertTone } from "./alertTone"
import { cn } from "./cn"

interface InlineAlertProps extends PropsWithChildren {
  tone?: AlertTone
}

export function InlineAlert({ children, tone = "info" }: InlineAlertProps): React.JSX.Element {
  return <div className={cn("rounded-md border px-3 py-2 text-sm", alertToneClass(tone))}>{children}</div>
}

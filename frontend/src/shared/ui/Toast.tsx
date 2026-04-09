import { alertToneClass, type AlertTone } from "@/shared/ui/alertTone"
import { cn } from "@/shared/ui/cn"
import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from "react"


interface ToastProps extends PropsWithChildren {
  tone?: AlertTone
  title?: string
  autoHideMs?: number
}

export function Toast({ children, tone = "info", title, autoHideMs = 5000 }: ToastProps): React.JSX.Element {
  const [visible, setVisible] = useState<boolean>(true)
  const timeoutRef = useRef<number | null>(null)
  const startedAtRef = useRef<number>(0)
  const remainingMsRef = useRef<number>(autoHideMs)

  const clearTimer = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  const startTimer = useCallback(() => {
    clearTimer()

    if (remainingMsRef.current <= 0) {
      setVisible(false)
      return
    }

    startedAtRef.current = Date.now()
    timeoutRef.current = window.setTimeout(() => {
      setVisible(false)
      timeoutRef.current = null
    }, remainingMsRef.current)
  }, [clearTimer])

  const pauseTimer = useCallback(() => {
    if (timeoutRef.current === null) {
      return
    }

    const elapsed = Date.now() - startedAtRef.current
    remainingMsRef.current = Math.max(0, remainingMsRef.current - elapsed)
    clearTimer()
  }, [clearTimer])

  const resumeTimer = useCallback(() => {
    if (!visible) {
      return
    }
    startTimer()
  }, [startTimer, visible])

  useEffect(() => {
    setVisible(true)
    remainingMsRef.current = autoHideMs
    startTimer()

    return () => {
      clearTimer()
    }
  }, [autoHideMs, children, clearTimer, startTimer, title, tone])

  return (
    <div
      className={cn(
        "fixed right-4 top-4 z-50 w-[min(460px,calc(100vw-2rem))] pointer-events-none transition-all duration-300 ease-out",
        visible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0",
      )}
    >
      <div
        className={cn("toast pointer-events-auto rounded-lg border px-4 py-3 shadow-lg", alertToneClass(tone))}
        role="alert"
        aria-live="polite"
        onMouseEnter={pauseTimer}
        onMouseLeave={resumeTimer}
      >
        {title ? <p className="text-sm font-bold">{title}</p> : null}
        <p className={title ? "mt-1 text-sm" : "text-sm"}>{children}</p>
      </div>
    </div>
  )
}

import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from "react"

interface ToastProps extends PropsWithChildren {
  tone?: "info" | "warn" | "error"
  title?: string
  autoHideMs?: number
}

function toneClass(tone: "info" | "warn" | "error"): string {
  if (tone === "error") {
    return "border-red-300 bg-red-50 text-red-800"
  }
  if (tone === "warn") {
    return "border-amber-300 bg-amber-50 text-amber-900"
  }
  return "border-sky-300 bg-sky-50 text-sky-900"
}

export function Toast({ children, tone = "info", title, autoHideMs = 5000 }: ToastProps): JSX.Element {
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
      className={`fixed right-4 top-4 z-50 w-[min(460px,calc(100vw-2rem))] transition-all duration-300 ease-out ${
        visible ? "pointer-events-none translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
      }`}
    >
      <div
        className={`pointer-events-auto rounded-lg border px-4 py-3 shadow-lg ${toneClass(tone)}`}
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

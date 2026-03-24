import { useEffect, useRef } from "react"

type ForegroundHandler = () => void | Promise<void>

export function useAppForegroundRefresh(onForeground: ForegroundHandler): void {
    const onForegroundRef = useRef<ForegroundHandler>(onForeground)

    useEffect(() => {
        onForegroundRef.current = onForeground
    }, [onForeground])

    useEffect(() => {
        const invokeForegroundHandler = () => {
            void onForegroundRef.current()
        }

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                invokeForegroundHandler()
            }
        }

        window.addEventListener("focus", invokeForegroundHandler)
        document.addEventListener("visibilitychange", handleVisibilityChange)

        return () => {
            window.removeEventListener("focus", invokeForegroundHandler)
            document.removeEventListener("visibilitychange", handleVisibilityChange)
        }
    }, [])
}

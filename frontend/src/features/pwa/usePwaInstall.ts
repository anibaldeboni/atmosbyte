import { useCallback, useEffect, useMemo, useState } from "react"

type InstallOutcome = "accepted" | "dismissed" | "unavailable"
type InstallPlatform = "android" | "ios" | "none"

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

interface NavigatorWithStandalone extends Navigator {
    standalone?: boolean
}

function isIOS(userAgent: string, platform: string, maxTouchPoints: number): boolean {
    if (/iPad|iPhone|iPod/i.test(userAgent)) {
        return true
    }

    // iPadOS can expose a desktop-like UA (Macintosh), so also check touch capability.
    return platform === "MacIntel" && maxTouchPoints > 1
}

function isSafari(userAgent: string): boolean {
    return /Safari/i.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(userAgent)
}

function isStandaloneMode(): boolean {
    const navigatorStandalone = (navigator as NavigatorWithStandalone).standalone === true
    const mediaStandalone = typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches
    return navigatorStandalone || mediaStandalone
}

export interface PwaInstallState {
    platform: InstallPlatform
    isInstallAvailable: boolean
    isInstalled: boolean
    isPrompting: boolean
    requestInstall: () => Promise<InstallOutcome>
}

export function usePwaInstall(): PwaInstallState {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const [isInstalled, setIsInstalled] = useState<boolean>(() => isStandaloneMode())
    const [isPrompting, setIsPrompting] = useState(false)

    useEffect(() => {
        const onBeforeInstallPrompt = (event: Event) => {
            event.preventDefault()
            setDeferredPrompt(event as BeforeInstallPromptEvent)
        }

        const onAppInstalled = () => {
            setDeferredPrompt(null)
            setIsInstalled(true)
        }

        const onDisplayModeChange = () => {
            setIsInstalled(isStandaloneMode())
        }

        window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt)
        window.addEventListener("appinstalled", onAppInstalled)

        const mediaQuery = typeof window.matchMedia === "function" ? window.matchMedia("(display-mode: standalone)") : null
        if (mediaQuery) {
            if (typeof mediaQuery.addEventListener === "function") {
                mediaQuery.addEventListener("change", onDisplayModeChange)
            } else if (typeof mediaQuery.addListener === "function") {
                mediaQuery.addListener(onDisplayModeChange)
            }
        }

        return () => {
            window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt)
            window.removeEventListener("appinstalled", onAppInstalled)

            if (mediaQuery) {
                if (typeof mediaQuery.removeEventListener === "function") {
                    mediaQuery.removeEventListener("change", onDisplayModeChange)
                } else if (typeof mediaQuery.removeListener === "function") {
                    mediaQuery.removeListener(onDisplayModeChange)
                }
            }
        }
    }, [])

    const platform = useMemo<InstallPlatform>(() => {
        if (isInstalled) {
            return "none"
        }
        if (deferredPrompt) {
            return "android"
        }

        const userAgent = navigator.userAgent
        const platformName = navigator.platform ?? ""
        const touchPoints = typeof navigator.maxTouchPoints === "number" ? navigator.maxTouchPoints : 0

        if (isIOS(userAgent, platformName, touchPoints) && isSafari(userAgent)) {
            return "ios"
        }

        return "none"
    }, [deferredPrompt, isInstalled])

    const requestInstall = useCallback(async (): Promise<InstallOutcome> => {
        if (!deferredPrompt) {
            return "unavailable"
        }

        setIsPrompting(true)

        try {
            await deferredPrompt.prompt()
            const result = await deferredPrompt.userChoice
            setDeferredPrompt(null)
            return result.outcome
        } finally {
            setIsPrompting(false)
        }
    }, [deferredPrompt])

    return {
        platform,
        isInstallAvailable: platform !== "none",
        isInstalled,
        isPrompting,
        requestInstall,
    }
}

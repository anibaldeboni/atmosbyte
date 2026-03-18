import { act, fireEvent, render, screen } from "@testing-library/react"

import { usePwaInstall } from "./usePwaInstall"

interface BeforeInstallPromptEventLike extends Event {
    prompt: jest.Mock<Promise<void>, []>
    userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

function createBeforeInstallPromptEvent(outcome: "accepted" | "dismissed"): BeforeInstallPromptEventLike {
    const event = new Event("beforeinstallprompt") as BeforeInstallPromptEventLike
    event.preventDefault = jest.fn()
    event.prompt = jest.fn(async () => { })
    event.userChoice = Promise.resolve({ outcome, platform: "web" })
    return event
}

function mockUserAgent(value: string): void {
    Object.defineProperty(window.navigator, "userAgent", {
        value,
        configurable: true,
    })
}

function mockPlatform(value: string): void {
    Object.defineProperty(window.navigator, "platform", {
        value,
        configurable: true,
    })
}

function mockMaxTouchPoints(value: number): void {
    Object.defineProperty(window.navigator, "maxTouchPoints", {
        value,
        configurable: true,
    })
}

function mockStandalone(value: boolean | undefined): void {
    Object.defineProperty(window.navigator, "standalone", {
        value,
        configurable: true,
    })
}

function mockMatchMedia(matches: boolean): void {
    Object.defineProperty(window, "matchMedia", {
        configurable: true,
        writable: true,
        value: jest.fn().mockImplementation(() => ({
            matches,
            media: "(display-mode: standalone)",
            onchange: null,
            addListener: jest.fn(),
            removeListener: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            dispatchEvent: jest.fn(),
        })),
    })
}

function Probe(): React.JSX.Element {
    const { platform, isInstallAvailable, isInstalled, requestInstall } = usePwaInstall()

    return (
        <div>
            <div data-testid="platform">{platform}</div>
            <div data-testid="available">{isInstallAvailable ? "yes" : "no"}</div>
            <div data-testid="installed">{isInstalled ? "yes" : "no"}</div>
            <button
                type="button"
                onClick={() => {
                    void requestInstall().then((outcome) => {
                        ; (window as Window & { __installOutcome?: string }).__installOutcome = outcome
                    })
                }}
            >
                install
            </button>
        </div>
    )
}

beforeEach(() => {
    mockMatchMedia(false)
    mockStandalone(undefined)
    mockUserAgent("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/123.0.0.0 Mobile Safari/537.36")
    mockPlatform("Linux armv8")
    mockMaxTouchPoints(1)
        ; (window as Window & { __installOutcome?: string }).__installOutcome = undefined
})

test("exposes android install state when beforeinstallprompt is received", async () => {
    render(<Probe />)

    expect(screen.getByTestId("platform")).toHaveTextContent("none")

    const event = createBeforeInstallPromptEvent("accepted")
    await act(async () => {
        window.dispatchEvent(event)
    })

    expect(event.preventDefault).toHaveBeenCalled()
    expect(screen.getByTestId("platform")).toHaveTextContent("android")
    expect(screen.getByTestId("available")).toHaveTextContent("yes")

    await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "install" }))
    })

    expect(event.prompt).toHaveBeenCalledTimes(1)
    expect((window as Window & { __installOutcome?: string }).__installOutcome).toBe("accepted")
})

test("exposes ios install guidance state without beforeinstallprompt", () => {
    mockUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1")
    mockPlatform("iPhone")
    mockMaxTouchPoints(5)

    render(<Probe />)

    expect(screen.getByTestId("platform")).toHaveTextContent("ios")
    expect(screen.getByTestId("available")).toHaveTextContent("yes")
    expect(screen.getByTestId("installed")).toHaveTextContent("no")
})

test("exposes ios state for iPadOS desktop-like user agent", () => {
    mockUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1")
    mockPlatform("MacIntel")
    mockMaxTouchPoints(5)

    render(<Probe />)

    expect(screen.getByTestId("platform")).toHaveTextContent("ios")
    expect(screen.getByTestId("available")).toHaveTextContent("yes")
})

test("hides install state when running in standalone mode", () => {
    mockStandalone(true)

    render(<Probe />)

    expect(screen.getByTestId("platform")).toHaveTextContent("none")
    expect(screen.getByTestId("installed")).toHaveTextContent("yes")
})

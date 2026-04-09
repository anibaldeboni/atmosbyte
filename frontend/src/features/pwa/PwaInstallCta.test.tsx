import { PwaInstallCta } from "@/features/pwa/PwaInstallCta"
import { usePwaInstall } from "@/features/pwa/usePwaInstall"
import { fireEvent, render, screen } from "@testing-library/react"


jest.mock("./usePwaInstall")

const mockedUsePwaInstall = jest.mocked(usePwaInstall)

beforeEach(() => {
    mockedUsePwaInstall.mockReset()
})

test("does not render when install is unavailable", () => {
    mockedUsePwaInstall.mockReturnValue({
        platform: "none",
        isInstallAvailable: false,
        isInstalled: false,
        isPrompting: false,
        requestInstall: jest.fn(async () => "unavailable" as const),
    })

    const { container } = render(<PwaInstallCta />)

    expect(container).toBeEmptyDOMElement()
})

test("renders android CTA and triggers install prompt", () => {
    const requestInstall = jest.fn(async () => "accepted" as const)

    mockedUsePwaInstall.mockReturnValue({
        platform: "android",
        isInstallAvailable: true,
        isInstalled: false,
        isPrompting: false,
        requestInstall,
    })

    render(<PwaInstallCta />)

    const cta = screen.getByRole("button", { name: "Instalar aplicativo Atmosbyte" })
    expect(cta).toBeInTheDocument()

    fireEvent.click(cta)

    expect(requestInstall).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText("Instalar aplicativo")).toHaveClass("md:hidden")
})

test("renders ios guidance flow", () => {
    mockedUsePwaInstall.mockReturnValue({
        platform: "ios",
        isInstallAvailable: true,
        isInstalled: false,
        isPrompting: false,
        requestInstall: jest.fn(async () => "unavailable" as const),
    })

    render(<PwaInstallCta />)

    const cta = screen.getByRole("button", { name: "Ver como instalar no iPhone" })
    fireEvent.click(cta)

    expect(screen.getByText(/No Safari, toque em Compartilhar/i)).toBeInTheDocument()
})

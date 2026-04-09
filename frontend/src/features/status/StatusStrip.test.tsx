import { StatusStrip } from "@/features/status/StatusStrip"
import { useStatusPolling } from "@/features/status/useStatusPolling"
import { render, screen } from "@testing-library/react"


jest.mock("./useStatusPolling")

const mockedUseStatusPolling = jest.mocked(useStatusPolling)

beforeEach(() => {
    mockedUseStatusPolling.mockReset()
})

test("uses flex space-between layout for loaded items", () => {
    mockedUseStatusPolling.mockReturnValue({
        loading: false,
        intervalMs: 5000,
        status: {
            level: "ok",
            sensorLevel: "ok",
            queueLevel: "warn",
            queueSize: 3,
            retryQueueSize: 1,
            updatedAt: Date.UTC(2026, 2, 19, 10, 30, 0),
            isDegraded: false,
            message: "",
            health: "",
            sensor: "",
            workers: 0
        },
    })

    const { container } = render(<StatusStrip />)

    const layout = container.querySelector(".status-strip > div")
    const items = screen.getAllByRole("tooltip")

    expect(layout).not.toBeNull()
    expect(layout).toHaveClass("flex", "flex-wrap", "justify-between", "xl:gap-x-0")
    expect(items).toHaveLength(4)
    items.forEach(item => {
        const wrapper = item.parentElement
        expect(wrapper).not.toBeNull()
        expect(wrapper).toHaveClass("w-[calc(50%-0.375rem)]", "xl:w-auto", "xl:flex-none")
    })
    expect(screen.getByText("Fila: 3 (1 tentativas)")).toBeInTheDocument()
})

test("keeps skeletons in the same flex layout while loading", () => {
    mockedUseStatusPolling.mockReturnValue({
        loading: true,
        intervalMs: 5000,
        status: {
            level: "ok",
            sensorLevel: "ok",
            queueLevel: "ok",
            queueSize: 0,
            retryQueueSize: 0,
            updatedAt: Date.now(),
            isDegraded: false,
            message: "",
            health: "",
            sensor: "",
            workers: 0
        },
    })

    const { container } = render(<StatusStrip />)

    const layout = container.querySelector(".status-strip > div")
    const skeletons = container.querySelectorAll(".status-strip-skeleton")

    expect(layout).not.toBeNull()
    expect(layout).toHaveClass("flex", "flex-wrap", "justify-between", "xl:gap-x-0")
    expect(skeletons).toHaveLength(4)
    skeletons.forEach(skeleton => {
        expect(skeleton).toHaveClass("w-[calc(50%-0.375rem)]", "xl:w-[11.5rem]")
    })
})
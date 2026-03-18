import type { PropsWithChildren } from "react"

interface TooltipProps extends PropsWithChildren {
    content: string
    as?: "span" | "div"
    className?: string
    side?: "top" | "bottom"
}

export function Tooltip({ content, as = "span", className, children, side = "top" }: TooltipProps): React.JSX.Element {
    const Wrapper = as

    if (!content.trim()) {
        return <>{children}</>
    }

    const sideClass = side === "bottom" ? "top-[calc(100%+0.45rem)]" : "bottom-[calc(100%+0.45rem)]"

    return (
        <Wrapper className={`group relative min-w-0 ${className ?? ""}`.trim()}>
            {children}
            <span
                role="tooltip"
                className={`app-tooltip-bubble pointer-events-none absolute left-1/2 z-40 w-max max-w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 rounded-md border px-2.5 py-1.5 text-xs font-semibold leading-tight opacity-0 shadow-md transition-opacity duration-150 ease-out group-hover:opacity-100 group-focus-within:opacity-100 ${sideClass}`}
            >
                {content}
            </span>
        </Wrapper>
    )
}
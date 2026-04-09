import React from "react"

export { ClockIcon, ComputerDesktopIcon as ComputerIcon, QueueListIcon } from "@heroicons/react/24/outline"

export function ThermometerIcon(props: React.SVGProps<SVGSVGElement>): React.JSX.Element {
    return (
        <svg viewBox="0 0 24 24" fill="none" {...props}>
            <path
                d="M14 14.76V5a2 2 0 1 0-4 0v9.76a4 4 0 1 0 4 0Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path d="M12 11v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    )
}

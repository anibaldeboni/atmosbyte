import React from "react"

export function TemperatureIcon(props: React.SVGProps<SVGSVGElement>): React.JSX.Element {
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

export function HumidityIcon(props: React.SVGProps<SVGSVGElement>): React.JSX.Element {
    return (
        <svg viewBox="0 0 24 24" fill="none" {...props}>
            <path
                d="M12 3.5C9 7.5 6 10.2 6 14a6 6 0 1 0 12 0c0-3.8-3-6.5-6-10.5Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

export function PressureIcon(props: React.SVGProps<SVGSVGElement>): React.JSX.Element {
    return (
        <svg viewBox="0 0 24 24" fill="none" {...props}>
            <path d="M5 15h3M10.5 12h3M16 9h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
    )
}

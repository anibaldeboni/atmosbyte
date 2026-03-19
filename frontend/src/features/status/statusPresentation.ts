import type { StatusLevel } from "../../shared/types/status"

export function statusIconToneClass(level: StatusLevel): string {
    if (level === "error") {
        return "status-icon-error"
    }

    if (level === "warn") {
        return "status-icon-warn"
    }

    return "status-icon-ok"
}

export function humanStatus(level: StatusLevel): string {
    if (level === "error") {
        return "Indisponível"
    }

    if (level === "warn") {
        return "Degradado"
    }

    return "Operacional"
}

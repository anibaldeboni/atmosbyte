export type AlertTone = "info" | "warn" | "error"

export function alertToneClass(tone: AlertTone): string {
    if (tone === "error") {
        return "tone-error"
    }

    if (tone === "warn") {
        return "tone-warn"
    }

    return "tone-info"
}

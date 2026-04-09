import type { Theme } from "@/app/theme/themeResolver"

const THEME_COLOR_MAP: Record<Theme, string> = {
    light: "#166534",
    dark: "#171f31",
}

export function applyThemeToDocument(doc: Document, theme: Theme): void {
    doc.documentElement.dataset.theme = theme
    doc.documentElement.style.colorScheme = theme

    if (typeof doc.querySelector !== "function") {
        return
    }

    const metaThemeColor = doc.querySelector('meta[name="theme-color"]')
    if (metaThemeColor && "setAttribute" in metaThemeColor) {
        metaThemeColor.setAttribute("content", THEME_COLOR_MAP[theme])
    }
}

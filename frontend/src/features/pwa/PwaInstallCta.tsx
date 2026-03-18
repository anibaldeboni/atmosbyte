import { useState } from "react"

import { Button } from "../../shared/ui/Button"
import { InlineAlert } from "../../shared/ui/InlineAlert"
import { usePwaInstall } from "./usePwaInstall"

export function PwaInstallCta(): React.JSX.Element | null {
    const { platform, isInstallAvailable, isPrompting, requestInstall } = usePwaInstall()
    const [showIosGuide, setShowIosGuide] = useState(false)

    if (!isInstallAvailable) {
        return null
    }

    const onClick = async () => {
        if (platform === "ios") {
            setShowIosGuide((previous) => !previous)
            return
        }

        await requestInstall()
    }

    return (
        <section className="md:hidden" aria-label="Instalar aplicativo">
            <div className="app-card rounded-lg border p-4">
                <p className="metric-card-helper mb-3 text-sm font-semibold">Instala rapido, abre sem navegador e funciona melhor no celular.</p>
                <Button
                    type="button"
                    className="flex min-h-12 w-full items-center justify-center gap-2 text-[15px]"
                    onClick={() => {
                        void onClick()
                    }}
                    disabled={platform === "android" && isPrompting}
                    aria-label={platform === "android" ? "Instalar aplicativo Atmosbyte" : "Ver como instalar no iPhone"}
                >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
                        <path d="M12 3v11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        <path d="m8 10 4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M4 16.8v.7a1.5 1.5 0 0 0 1.5 1.5h13a1.5 1.5 0 0 0 1.5-1.5v-.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    {platform === "android" ? "Instalar app" : "Como instalar no iPhone"}
                </Button>
                {platform === "ios" && showIosGuide ? (
                    <div className="mt-3">
                        <InlineAlert tone="info">
                            No Safari, toque em Compartilhar e depois em Adicionar à Tela de Início para instalar o app.
                        </InlineAlert>
                    </div>
                ) : null}
            </div>
        </section>
    )
}

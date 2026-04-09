import { usePwaInstall } from "@/features/pwa/usePwaInstall"
import { Button } from "@/shared/ui/Button"
import { InlineAlert } from "@/shared/ui/InlineAlert"
import { ArrowDownTrayIcon } from "@/shared/ui/icons/actions"
import { useState } from "react"


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
                    <ArrowDownTrayIcon className="h-5 w-5" aria-hidden="true" />
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

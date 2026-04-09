import { ArrowPathIcon } from "@/shared/ui/icons"
import { Button } from "@/shared/ui/Button"
import { cn } from "@/shared/ui/cn"

interface MetricsRefreshBarProps {
    onRefresh: () => Promise<void>
    lastUpdatedAt: Date | null
    loading: boolean
}

const timestampFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "medium",
})

export function MetricsRefreshBar({ onRefresh, lastUpdatedAt, loading }: MetricsRefreshBarProps): React.JSX.Element {
    const timestampLabel = lastUpdatedAt ? timestampFormatter.format(lastUpdatedAt) : "-"

    return (
        <div className="flex items-center justify-center gap-3">
            <Button
                variant="secondary"
                size="md"
                className="inline-flex h-10 w-10 items-center justify-center !border-0 border-transparent p-0 leading-none"
                style={{ border: "none" }}
                disabled={loading}
                onClick={() => {
                    void onRefresh()
                }}
                aria-label="Atualizar dados"
            >
                <span className={cn("inline-flex items-center justify-center", loading && "animate-spin motion-reduce:animate-none")}>
                    <ArrowPathIcon className="h-5 w-5" aria-hidden="true" />
                </span>
            </Button>
            <span className="min-w-0 truncate text-sm text-muted-foreground tabular-nums">
                Atualizado em {timestampLabel}
            </span>
        </div>
    )
}

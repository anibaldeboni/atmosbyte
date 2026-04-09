import { MetricsGrid } from "@/features/current-metrics/MetricsGrid"
import { MetricsRefreshBar } from "@/features/current-metrics/MetricsRefreshBar"
import { useCurrentMetrics } from "@/features/current-metrics/useCurrentMetrics"
import { PwaInstallCta } from "@/features/pwa/PwaInstallCta"
import { InlineAlert } from "@/shared/ui/InlineAlert"

interface HomePageProps {
}

export function HomePage({ }: HomePageProps): React.JSX.Element {
  const { data, loading, error, degraded, intervalMs, refresh, lastUpdatedAt } = useCurrentMetrics()

  return (
    <div className="space-y-6">
      <section>
        <h2 className="page-heading text-[42px] font-extrabold tracking-[-0.03em]">
          <span className="md:hidden">Tempo atual</span>
          <span className="hidden md:inline">Visão geral do tempo atual</span>
        </h2>
        <p className="page-subheading mt-1 hidden text-[19px] font-medium tracking-[0.005em] md:block">
          Acompanhe os indicadores meteorológicos mais recentes
        </p>
      </section>
      <PwaInstallCta />
      {degraded ? (
        <InlineAlert tone="warn">Conexão degradada. Intervalo de polling alterado para {intervalMs / 1000}s.</InlineAlert>
      ) : null}
      {error ? <InlineAlert tone="error">{error.message}</InlineAlert> : null}
      <MetricsGrid data={data} loading={loading} />
      <MetricsRefreshBar onRefresh={refresh} loading={loading} lastUpdatedAt={lastUpdatedAt} />
    </div>
  )
}

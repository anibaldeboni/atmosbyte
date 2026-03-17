import { MetricsGrid } from "../features/current-metrics/MetricsGrid"
import { useCurrentMetrics } from "../features/current-metrics/useCurrentMetrics"
import { InlineAlert } from "../shared/ui/InlineAlert"

interface HomePageProps {
}

export function HomePage({ }: HomePageProps): React.JSX.Element {
  const { data, loading, error, degraded, intervalMs } = useCurrentMetrics()

  return (
    <div className="space-y-6">
      <section>
        <h2 className="page-heading text-[42px] font-extrabold tracking-[-0.03em]">Visão geral do tempo atual</h2>
        <p className="page-subheading mt-1 text-[19px] font-medium tracking-[0.005em]">
          Acompanhe os indicadores meteorológicos mais recentes
        </p>
      </section>
      {degraded ? (
        <InlineAlert tone="warn">Conexão degradada. Intervalo de polling alterado para {intervalMs / 1000}s.</InlineAlert>
      ) : null}
      {error ? <InlineAlert tone="error">{error}</InlineAlert> : null}
      <MetricsGrid data={data} loading={loading} />
    </div>
  )
}

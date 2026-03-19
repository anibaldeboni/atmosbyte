import type { ReactNode } from "react"

import { Card } from "./Card"

interface MetricCardProps {
  label: string
  value: string
  helper?: string
  icon?: ReactNode
}

export function MetricCard({ label, value, helper, icon }: MetricCardProps): React.JSX.Element {
  const parts = value.split(" ")
  const numberValue = parts[0] ?? value
  const unitValue = parts.length > 1 ? parts.slice(1).join(" ") : ""

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <p className="metric-card-label font-bold">{label}</p>
        {icon ? <span className="metric-card-label metric-card-icon inline-flex items-center justify-center" aria-hidden="true">{icon}</span> : null}
      </div>
      <div className="mt-2 flex items-end leading-none">
        <p className="metric-card-value font-extrabold tracking-[-0.02em]">{numberValue}</p>
        {unitValue ? <span className="metric-card-helper metric-card-unit ml-1">{unitValue}</span> : null}
      </div>
      {helper ? <p className="metric-card-helper mt-2 font-medium">{helper}</p> : null}
    </Card>
  )
}

import type { ReactNode } from "react"

import { Card } from "./Card"

interface MetricCardProps {
  label: string
  value: string
  helper?: string
  icon?: ReactNode
}

export function MetricCard({ label, value, helper, icon }: MetricCardProps): JSX.Element {
  const parts = value.split(" ")
  const numberValue = parts[0] ?? value
  const unitValue = parts.length > 1 ? parts.slice(1).join(" ") : ""

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <p className="metric-card-label font-bold">{label}</p>
        {icon ? <span className="metric-card-label inline-flex h-[26px] w-[26px] items-center justify-center" aria-hidden="true">{icon}</span> : null}
      </div>
      <div className="mt-2 flex items-end leading-none">
        <p className="metric-card-value text-[56px] font-extrabold tracking-[-0.02em]">{numberValue}</p>
        {unitValue ? <span className="metric-card-helper ml-1 text-[24px]">{unitValue}</span> : null}
      </div>
      {helper ? <p className="metric-card-helper mt-2 font-medium">{helper}</p> : null}
    </Card>
  )
}

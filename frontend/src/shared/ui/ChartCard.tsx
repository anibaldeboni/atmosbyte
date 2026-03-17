import type { PropsWithChildren } from "react"

import { Card } from "./Card"

interface ChartCardProps extends PropsWithChildren {
  title: string
  subtitle?: string
  legend?: JSX.Element
}

export function ChartCard({ title, subtitle, legend, children }: ChartCardProps): JSX.Element {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="chart-card-title text-[21px] font-bold tracking-[-0.01em]">{title}</h3>
          {subtitle ? <p className="chart-card-subtitle mt-1 text-[14px]">{subtitle}</p> : null}
        </div>
        {legend ? <div className="pt-1">{legend}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </Card>
  )
}

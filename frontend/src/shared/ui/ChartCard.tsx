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
          <h3 className="text-[21px] font-bold tracking-[-0.01em] text-[#111827]">{title}</h3>
          {subtitle ? <p className="mt-1 text-[14px] text-[#667085]">{subtitle}</p> : null}
        </div>
        {legend ? <div className="pt-1">{legend}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </Card>
  )
}

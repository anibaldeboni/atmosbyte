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
        <p className="font-bold text-[#475467]">{label}</p>
        {icon ? <span className="inline-flex h-[26px] w-[26px] items-center justify-center text-[#475467]" aria-hidden="true">{icon}</span> : null}
      </div>
      <div className="mt-2 flex items-end leading-none">
        <p className="text-[56px] font-extrabold tracking-[-0.02em] text-slate-900">{numberValue}</p>
        {unitValue ? <span className="ml-1 text-[24px] text-[#667085]">{unitValue}</span> : null}
      </div>
      {helper ? <p className="mt-2 font-medium text-[#667085]">{helper}</p> : null}
    </Card>
  )
}

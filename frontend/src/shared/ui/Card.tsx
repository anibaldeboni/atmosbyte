import type { PropsWithChildren } from "react"

export function Card({ children }: PropsWithChildren): JSX.Element {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">{children}</section>
}

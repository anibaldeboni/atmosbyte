import type { PropsWithChildren } from "react"

export function Card({ children }: PropsWithChildren): React.JSX.Element {
  return <section className="app-card rounded-2xl border p-5 shadow-sm">{children}</section>
}

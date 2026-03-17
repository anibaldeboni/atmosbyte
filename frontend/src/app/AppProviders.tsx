import type { PropsWithChildren } from "react"

import { ThemeProvider } from "./theme/ThemeProvider"

export function AppProviders({ children }: PropsWithChildren): JSX.Element {
  return <ThemeProvider>{children}</ThemeProvider>
}

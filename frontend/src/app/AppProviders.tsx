import type { PropsWithChildren } from "react"

import { ThemeProvider } from "./theme/ThemeProvider"

export function AppProviders({ children }: PropsWithChildren): React.JSX.Element {
  return <ThemeProvider>{children}</ThemeProvider>
}

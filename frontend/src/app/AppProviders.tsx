import { ThemeProvider } from "@/app/theme/ThemeProvider"
import type { PropsWithChildren } from "react"


export function AppProviders({ children }: PropsWithChildren): React.JSX.Element {
  return <ThemeProvider>{children}</ThemeProvider>
}

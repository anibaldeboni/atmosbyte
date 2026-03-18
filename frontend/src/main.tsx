import { Suspense } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "react-router-dom"

import { AppProviders } from "./app/AppProviders"
import { router } from "./app/router"
import { Skeleton } from "./shared/ui/Skeleton"
import "react-datepicker/dist/react-datepicker.css"
import "./styles.css"

const rootElement = document.getElementById("root")

if (!rootElement) {
  throw new Error("Root element not found")
}

createRoot(rootElement).render(
  <AppProviders>
    <Suspense fallback={<Skeleton className="m-4 h-16 w-full" />}>
      <RouterProvider router={router} />
    </Suspense>
  </AppProviders>,
)

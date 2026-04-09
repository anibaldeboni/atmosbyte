import { AppProviders } from "@/app/AppProviders"
import { router } from "@/app/router"
import { Skeleton } from "@/shared/ui/Skeleton"
import { Suspense } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "react-router-dom"

import "@/styles.css"
import "react-datepicker/dist/react-datepicker.css"


const rootElement = document.getElementById("root")

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/service-worker.js").catch((error: unknown) => {
      console.error("Service worker registration failed", error)
    })
  })
}

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

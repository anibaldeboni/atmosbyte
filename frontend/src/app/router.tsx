import { HomePage } from "@/pages/HomePage"
import { NotFoundPage } from "@/pages/NotFoundPage"
import { AppShell } from "@/shared/ui/AppShell"
import { Skeleton } from "@/shared/ui/Skeleton"
import { lazy, Suspense } from "react"
import { createBrowserRouter, type RouteObject } from "react-router-dom"


const HistoricalPage = lazy(async () => {
  const module = await import("../pages/HistoricalPage")
  return { default: module.HistoricalPage }
})

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "historical",
        element: (
          <Suspense fallback={<Skeleton className="h-40 w-full" />}>
            <HistoricalPage />
          </Suspense>
        ),
      },
      {
        path: "*",
        element: <NotFoundPage />,
      },
    ],
  },
]

export const router = createBrowserRouter(routes)

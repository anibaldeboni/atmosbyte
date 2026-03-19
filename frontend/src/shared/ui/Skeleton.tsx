interface SkeletonProps {
  className?: string
}

import { cn } from "./cn"

export function Skeleton({ className }: SkeletonProps): React.JSX.Element {
  return <div className={cn("skeleton animate-pulse rounded-md", className)} aria-hidden="true" />
}

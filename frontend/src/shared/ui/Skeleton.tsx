interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps): JSX.Element {
  return <div className={`animate-pulse rounded-md bg-slate-200 ${className ?? ""}`.trim()} aria-hidden="true" />
}

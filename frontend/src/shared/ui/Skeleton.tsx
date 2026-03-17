interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps): React.JSX.Element {
  return <div className={`skeleton animate-pulse rounded-md ${className ?? ""}`.trim()} aria-hidden="true" />
}

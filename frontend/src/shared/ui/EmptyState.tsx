interface EmptyStateProps {
  title: string
  description: string
}

export function EmptyState({ title, description }: EmptyStateProps): React.JSX.Element {
  return (
    <div className="empty-state rounded-lg border border-dashed p-6 text-center">
      <p className="empty-state-title text-base font-semibold">{title}</p>
      <p className="empty-state-description mt-1 text-sm">{description}</p>
    </div>
  )
}

import type { ButtonHTMLAttributes } from "react"

export function Button(props: ButtonHTMLAttributes<HTMLButtonElement>): JSX.Element {
  const { className, ...rest } = props
  return (
    <button
      {...rest}
      className={`app-button rounded-md px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ""}`.trim()}
    />
  )
}

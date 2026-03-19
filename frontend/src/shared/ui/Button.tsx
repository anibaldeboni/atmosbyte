import { cva, type VariantProps } from "class-variance-authority"
import type { ButtonHTMLAttributes } from "react"

import { cn } from "./cn"

const buttonVariants = cva("rounded-md font-semibold disabled:cursor-not-allowed disabled:opacity-50", {
  variants: {
    variant: {
      primary: "app-button",
      secondary: "app-button-secondary",
    },
    size: {
      sm: "px-3 py-2 text-xs sm:text-sm",
      md: "px-4 py-2 text-sm",
      lg: "px-5 py-2.5 text-base",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "md",
  },
})

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { }

export function Button(props: ButtonProps): React.JSX.Element {
  const { className, variant, size, ...rest } = props
  return (
    <button
      {...rest}
      className={cn(buttonVariants({ variant, size }), className)}
    />
  )
}

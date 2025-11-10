import * as React from "react"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning"
}

export function Badge({
  className = "",
  variant = "default",
  ...props
}: BadgeProps) {
  const variants = {
    default:
      "bg-purple-600 text-white hover:bg-purple-700",
    secondary:
      "bg-gray-600 text-white hover:bg-gray-700",
    destructive:
      "bg-red-600 text-white hover:bg-red-700",
    outline:
      "border border-purple-500/30 text-purple-400 hover:bg-purple-500/10",
    success:
      "bg-green-600 text-white hover:bg-green-700",
    warning:
      "bg-orange-600 text-white hover:bg-orange-700",
  }

  return (
    <div
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variants[variant]} ${className}`}
      {...props}
    />
  )
}


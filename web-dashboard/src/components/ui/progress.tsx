import * as React from "react"

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  max?: number
  indicatorClassName?: string
}

export function Progress({
  value = 0,
  max = 100,
  className = "",
  indicatorClassName = "",
  ...props
}: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div
      className={`relative h-4 w-full overflow-hidden rounded-full bg-black/40 ${className}`}
      {...props}
    >
      <div
        className={`h-full w-full flex-1 bg-purple-600 transition-all duration-300 ${indicatorClassName}`}
        style={{ transform: `translateX(-${100 - percentage}%)` }}
      />
    </div>
  )
}


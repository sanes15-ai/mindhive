import * as React from "react"
import { AlertCircle, AlertTriangle, CheckCircle, Info } from "lucide-react"

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive" | "success" | "warning"
}

export function Alert({
  className = "",
  variant = "default",
  ...props
}: AlertProps) {
  const variants = {
    default:
      "bg-blue-500/20 border-blue-500/30 text-blue-400",
    destructive:
      "bg-red-500/20 border-red-500/30 text-red-400",
    success:
      "bg-green-500/20 border-green-500/30 text-green-400",
    warning:
      "bg-orange-500/20 border-orange-500/30 text-orange-400",
  }

  return (
    <div
      role="alert"
      className={`relative w-full rounded-lg border p-4 backdrop-blur-sm ${variants[variant]} ${className}`}
      {...props}
    />
  )
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface AlertTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement> {}

export function AlertTitle({ className = "", ...props }: AlertTitleProps) {
  return (
    <h5
      className={`mb-1 font-medium leading-none tracking-tight ${className}`}
      {...props}
    />
  )
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface AlertDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {}

export function AlertDescription({
  className = "",
  ...props
}: AlertDescriptionProps) {
  return (
    <div
      className={`text-sm [&_p]:leading-relaxed ${className}`}
      {...props}
    />
  )
}

export interface AlertIconProps {
  variant?: "default" | "destructive" | "success" | "warning"
  className?: string
}

export function AlertIcon({ variant = "default", className = "" }: AlertIconProps) {
  const icons = {
    default: Info,
    destructive: AlertCircle,
    success: CheckCircle,
    warning: AlertTriangle,
  }

  const Icon = icons[variant]

  return <Icon className={`h-4 w-4 ${className}`} />
}


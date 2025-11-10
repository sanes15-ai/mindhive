import * as React from "react"

export interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  className?: string
  disabled?: boolean
}

export function Select({
  value,
  onValueChange,
  children,
  className = "",
  disabled = false,
}: SelectProps) {
  return (
    <div className={`relative ${className}`}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            value,
            onValueChange,
            disabled,
          })
        }
        return child
      })}
    </div>
  )
}

export interface SelectTriggerProps {
  children: React.ReactNode
  className?: string
  value?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
}

export function SelectTrigger({
  children,
  className = "",
  disabled = false,
}: SelectTriggerProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={`flex h-10 w-full items-center justify-between rounded-md border border-purple-500/30 bg-black/40 px-3 py-2 text-sm text-white ring-offset-background placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  )
}

export interface SelectValueProps {
  placeholder?: string
  value?: string
}

export function SelectValue({ placeholder, value }: SelectValueProps) {
  return <span>{value || placeholder || "Select..."}</span>
}

export interface SelectContentProps {
  children: React.ReactNode
  className?: string
  value?: string
  onValueChange?: (value: string) => void
}

export function SelectContent({
  children,
  className = "",
  value,
  onValueChange,
}: SelectContentProps) {
  return (
    <div
      className={`absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-purple-500/30 bg-black/95 py-1 text-base shadow-lg backdrop-blur-sm ${className}`}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            value,
            onValueChange,
          })
        }
        return child
      })}
    </div>
  )
}

export interface SelectItemProps {
  value: string
  children: React.ReactNode
  className?: string
  currentValue?: string
  onValueChange?: (value: string) => void
}

export function SelectItem({
  value: itemValue,
  children,
  className = "",
  currentValue,
  onValueChange,
}: SelectItemProps) {
  const isSelected = currentValue === itemValue

  return (
    <div
      className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors ${
        isSelected
          ? "bg-purple-600 text-white"
          : "text-gray-300 hover:bg-purple-500/20"
      } ${className}`}
      onClick={() => onValueChange?.(itemValue)}
    >
      {children}
    </div>
  )
}


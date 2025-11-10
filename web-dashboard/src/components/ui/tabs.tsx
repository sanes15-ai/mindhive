import * as React from "react"

export interface TabsProps {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  className?: string
}

export function Tabs({
  defaultValue,
  value: controlledValue,
  onValueChange,
  children,
  className = "",
}: TabsProps) {
  const [value, setValue] = React.useState(defaultValue || "")
  const currentValue = controlledValue !== undefined ? controlledValue : value

  const handleValueChange = (newValue: string) => {
    if (controlledValue === undefined) {
      setValue(newValue)
    }
    onValueChange?.(newValue)
  }

  return (
    <div className={className} data-value={currentValue}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            value: currentValue,
            onValueChange: handleValueChange,
          })
        }
        return child
      })}
    </div>
  )
}

export interface TabsListProps {
  children: React.ReactNode
  className?: string
}

export function TabsList({ children, className = "" }: TabsListProps) {
  return (
    <div
      className={`inline-flex h-10 items-center justify-center rounded-md bg-black/40 p-1 text-gray-400 ${className}`}
      role="tablist"
    >
      {children}
    </div>
  )
}

export interface TabsTriggerProps {
  value: string
  children: React.ReactNode
  className?: string
  disabled?: boolean
  onValueChange?: (value: string) => void
  currentValue?: string
}

export function TabsTrigger({
  value: triggerValue,
  children,
  className = "",
  disabled = false,
  onValueChange,
  currentValue,
}: TabsTriggerProps) {
  const isActive = currentValue === triggerValue

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      disabled={disabled}
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
        isActive
          ? "bg-purple-600 text-white shadow-sm"
          : "hover:bg-purple-500/10 hover:text-purple-300"
      } ${className}`}
      onClick={() => !disabled && onValueChange?.(triggerValue)}
    >
      {children}
    </button>
  )
}

export interface TabsContentProps {
  value: string
  children: React.ReactNode
  className?: string
  currentValue?: string
}

export function TabsContent({
  value: contentValue,
  children,
  className = "",
  currentValue,
}: TabsContentProps) {
  if (currentValue !== contentValue) return null

  return (
    <div
      role="tabpanel"
      className={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`}
    >
      {children}
    </div>
  )
}


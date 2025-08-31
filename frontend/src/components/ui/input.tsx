import * as React from 'react'
import { cn } from '../../lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn('bg-muted/60 border border-border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/60', className)} {...props} />
))
Input.displayName = 'Input'
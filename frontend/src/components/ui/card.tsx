import * as React from 'react'
import { cn } from '../../lib/utils'

export const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('bg-card border border-border rounded-xl p-6 shadow-soft', className)} {...props} />
)
export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('mb-3', className)} {...props} />
)
export const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('text-xl font-semibold', className)} {...props} />
)
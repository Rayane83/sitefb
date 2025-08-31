import * as React from 'react'
import { cn } from '../../lib/utils'

export const Table = ({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
  <table className={cn('min-w-full text-sm', className)} {...props} />
)
export const THead = (props: React.HTMLAttributes<HTMLTableSectionElement>) => <thead className="opacity-80 text-left" {...props} />
export const TR = (props: React.HTMLAttributes<HTMLTableRowElement>) => <tr {...props} />
export const TH = ({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => <th className={cn('p-2', className)} {...props} />
export const TD = ({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => <td className={cn('p-2', className)} {...props} />
export const TBody = (props: React.HTMLAttributes<HTMLTableSectionElement>) => <tbody {...props} />
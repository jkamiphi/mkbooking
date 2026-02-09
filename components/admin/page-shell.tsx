import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

interface AdminPageShellProps {
  children: ReactNode
  className?: string
}

function AdminPageShell({ children, className }: AdminPageShellProps) {
  return <div className={cn("space-y-6", className)}>{children}</div>
}

interface AdminPageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
}

function AdminPageHeader({ title, description, actions }: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export { AdminPageShell, AdminPageHeader }

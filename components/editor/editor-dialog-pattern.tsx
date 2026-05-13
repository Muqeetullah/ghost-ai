import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

interface EditorDialogPatternProps {
  title: string
  description?: string
  children?: ReactNode
  footerActions?: ReactNode
  className?: string
}

export function EditorDialogPattern({
  title,
  description,
  children,
  footerActions,
  className,
}: EditorDialogPatternProps) {
  return (
    <section
      className={cn(
        "rounded-3xl border border-surface-border bg-bg-elevated text-copy-primary shadow-2xl",
        className
      )}
    >
      <div className="space-y-2 p-6">
        <h2 className="text-lg font-semibold leading-none text-copy-primary">
          {title}
        </h2>
        {description ? (
          <p className="text-sm leading-6 text-copy-muted">{description}</p>
        ) : null}
      </div>

      {children ? <div className="px-6 pb-6">{children}</div> : null}

      {footerActions ? (
        <footer className="flex flex-col-reverse gap-2 border-t border-surface-border bg-bg-subtle/50 p-6 sm:flex-row sm:justify-end">
          {footerActions}
        </footer>
      ) : null}
    </section>
  )
}

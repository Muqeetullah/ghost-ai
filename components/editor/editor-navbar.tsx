"use client"

import type { ReactNode } from "react"
import { UserButton } from "@clerk/nextjs"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"

import { clerkUserButtonAppearance } from "@/lib/clerk-appearance"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface EditorNavbarProps {
  isSidebarOpen: boolean
  onSidebarToggle: () => void
  centerContent?: ReactNode
  actions?: ReactNode
  className?: string
}

export function EditorNavbar({
  isSidebarOpen,
  onSidebarToggle,
  centerContent,
  actions,
  className,
}: EditorNavbarProps) {
  const SidebarIcon = isSidebarOpen ? PanelLeftClose : PanelLeftOpen
  const toggleLabel = isSidebarOpen ? "Close project sidebar" : "Open project sidebar"

  return (
    <header
      className={cn(
        "flex h-14 shrink-0 items-center border-b border-surface-border bg-surface/95 px-4",
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-center justify-start">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={toggleLabel}
          aria-pressed={isSidebarOpen}
          onClick={onSidebarToggle}
          className="text-copy-secondary hover:bg-bg-subtle hover:text-copy-primary"
        >
          <SidebarIcon className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center">
        {centerContent}
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        {actions}
        <UserButton
          appearance={clerkUserButtonAppearance}
          userProfileMode="modal"
        />
      </div>
    </header>
  )
}

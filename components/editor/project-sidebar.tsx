"use client"

import { Plus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface ProjectSidebarProps {
  isOpen: boolean
  onClose: () => void
  className?: string
}

function EmptyProjectState() {
  return (
    <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-surface-border-subtle bg-bg-subtle/40 p-6 text-center">
      <p className="max-w-48 text-sm leading-6 text-copy-muted">
        No projects to show yet.
      </p>
    </div>
  )
}

export function ProjectSidebar({
  isOpen,
  onClose,
  className,
}: ProjectSidebarProps) {
  return (
    <aside
      aria-hidden={!isOpen}
      inert={!isOpen}
      className={cn(
        "fixed top-[4.5rem] bottom-4 left-4 z-40 flex w-[min(22rem,calc(100vw-2rem))] flex-col rounded-2xl border border-surface-border bg-sidebar p-4 shadow-2xl backdrop-blur-xl transition-transform duration-200 ease-out",
        isOpen ? "translate-x-0" : "-translate-x-[calc(100%+2rem)]",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-copy-primary">Projects</h2>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Close project sidebar"
          onClick={onClose}
          className="text-copy-muted hover:bg-bg-subtle hover:text-copy-primary"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="my-projects" className="mt-4 min-h-0 flex-1">
        <TabsList className="grid w-full grid-cols-2 bg-bg-subtle">
          <TabsTrigger value="my-projects">My Projects</TabsTrigger>
          <TabsTrigger value="shared">Shared</TabsTrigger>
        </TabsList>
        <TabsContent value="my-projects" className="mt-4 flex min-h-0">
          <EmptyProjectState />
        </TabsContent>
        <TabsContent value="shared" className="mt-4 flex min-h-0">
          <EmptyProjectState />
        </TabsContent>
      </Tabs>

      <Button type="button" className="mt-4 w-full">
        <Plus className="h-4 w-4" />
        New Project
      </Button>
    </aside>
  )
}

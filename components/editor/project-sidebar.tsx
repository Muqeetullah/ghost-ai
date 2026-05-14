"use client"

import { Pencil, Plus, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { MockProject } from "@/components/editor/project-dialog-state"
import { cn } from "@/lib/utils"

interface ProjectSidebarProps {
  isOpen: boolean
  onClose: () => void
  ownedProjects: MockProject[]
  sharedProjects: MockProject[]
  onCreateProject: () => void
  onRenameProject: (project: MockProject) => void
  onDeleteProject: (project: MockProject) => void
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

interface ProjectListProps {
  projects: MockProject[]
  canManage: boolean
  onRenameProject: (project: MockProject) => void
  onDeleteProject: (project: MockProject) => void
}

function ProjectList({
  projects,
  canManage,
  onRenameProject,
  onDeleteProject,
}: ProjectListProps) {
  if (projects.length === 0) {
    return <EmptyProjectState />
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {projects.map((project) => (
        <div
          key={project.id}
          className="group flex items-center gap-3 rounded-xl border border-surface-border bg-bg-subtle/45 p-3 transition-colors hover:border-surface-border-subtle hover:bg-bg-subtle"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-copy-primary">
              {project.name}
            </p>
            <p className="mt-1 truncate font-mono text-xs text-copy-muted">
              /{project.slug}
            </p>
            <p className="mt-2 text-xs text-copy-faint">{project.updatedAt}</p>
          </div>

          {canManage ? (
            <div className="flex shrink-0 items-center gap-1 opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:group-focus-within:opacity-100">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Rename ${project.name}`}
                onClick={() => onRenameProject(project)}
                className="text-copy-muted hover:bg-bg-elevated hover:text-copy-primary"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Delete ${project.name}`}
                onClick={() => onDeleteProject(project)}
                className="text-copy-muted hover:bg-bg-elevated hover:text-state-error"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}

export function ProjectSidebar({
  isOpen,
  onClose,
  ownedProjects,
  sharedProjects,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  className,
}: ProjectSidebarProps) {
  return (
    <>
      {isOpen ? (
        <button
          type="button"
          aria-label="Close project sidebar"
          onClick={onClose}
          className="fixed inset-x-0 top-14 bottom-0 z-30 bg-[var(--overlay-backdrop)] md:hidden"
        />
      ) : null}

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
            <ProjectList
              projects={ownedProjects}
              canManage
              onRenameProject={onRenameProject}
              onDeleteProject={onDeleteProject}
            />
          </TabsContent>
          <TabsContent value="shared" className="mt-4 flex min-h-0">
            <ProjectList
              projects={sharedProjects}
              canManage={false}
              onRenameProject={onRenameProject}
              onDeleteProject={onDeleteProject}
            />
          </TabsContent>
        </Tabs>

        <Button type="button" className="mt-4 w-full" onClick={onCreateProject}>
          <Plus className="h-4 w-4" />
          New Project
        </Button>
      </aside>
    </>
  )
}

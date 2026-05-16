"use client"

import { useState } from "react"
import { Bot, Share2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CanvasRoom } from "@/components/editor/canvas-room"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectDialogs } from "@/components/editor/project-dialogs"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { ShareDialog } from "@/components/editor/share-dialog"
import { useProjectActions } from "@/hooks/use-project-actions"
import { cn } from "@/lib/utils"
import type { EditorProject } from "@/types/projects"

interface WorkspaceProject {
  id: string
  name: string
  accessRole: "owner" | "collaborator"
}

interface WorkspaceShellProps {
  project: WorkspaceProject
  ownedProjects: EditorProject[]
  sharedProjects: EditorProject[]
}

export function WorkspaceShell({
  project,
  ownedProjects,
  sharedProjects,
}: WorkspaceShellProps) {
  const [isProjectSidebarOpen, setIsProjectSidebarOpen] = useState(true)
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(true)
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const projectActions = useProjectActions({ activeProjectId: project.id })
  const canManageSharing = project.accessRole === "owner"

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-base text-copy-primary">
      <EditorNavbar
        isSidebarOpen={isProjectSidebarOpen}
        onSidebarToggle={() => setIsProjectSidebarOpen((isOpen) => !isOpen)}
        centerContent={
          <div className="min-w-0 text-center">
            <p className="truncate text-sm font-semibold text-copy-primary">
              {project.name}
            </p>
            <p className="mt-0.5 truncate font-mono text-[11px] text-copy-faint">
              /{project.id}
            </p>
          </div>
        }
        actions={
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Share project"
              onClick={() => setIsShareDialogOpen(true)}
              className="text-copy-muted hover:bg-bg-subtle hover:text-copy-primary"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button
              type="button"
              variant={isAiSidebarOpen ? "secondary" : "ghost"}
              size="sm"
              aria-label={isAiSidebarOpen ? "Close AI sidebar" : "Open AI sidebar"}
              aria-pressed={isAiSidebarOpen}
              onClick={() => setIsAiSidebarOpen((isOpen) => !isOpen)}
              className="text-copy-secondary hover:bg-bg-subtle hover:text-copy-primary"
            >
              <Bot className="h-4 w-4" />
              AI
            </Button>
          </>
        }
      />

      <ProjectSidebar
        isOpen={isProjectSidebarOpen}
        onClose={() => setIsProjectSidebarOpen(false)}
        ownedProjects={ownedProjects}
        sharedProjects={sharedProjects}
        activeProjectId={project.id}
        onCreateProject={projectActions.openCreateDialog}
        onRenameProject={projectActions.openRenameDialog}
        onDeleteProject={projectActions.openDeleteDialog}
      />

      <main className="relative min-h-0 flex-1 overflow-hidden bg-base">
        <CanvasRoom roomId={project.id} />
      </main>

      {isAiSidebarOpen ? (
        <button
          type="button"
          aria-label="Close AI sidebar"
          onClick={() => setIsAiSidebarOpen(false)}
          className="fixed inset-x-0 top-14 bottom-0 z-30 bg-[var(--overlay-backdrop)] md:hidden"
        />
      ) : null}

      <aside
        aria-hidden={!isAiSidebarOpen}
        inert={!isAiSidebarOpen}
        className={cn(
          "fixed top-[4.5rem] right-4 bottom-4 z-40 flex w-[min(22rem,calc(100vw-2rem))] flex-col rounded-2xl border border-surface-border bg-sidebar p-4 shadow-2xl backdrop-blur-xl transition-transform duration-200 ease-out",
          isAiSidebarOpen ? "translate-x-0" : "translate-x-[calc(100%+2rem)]"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-copy-primary">AI</h2>
            <p className="mt-1 truncate text-xs text-copy-muted">
              Workspace assistant
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Close AI sidebar"
            onClick={() => setIsAiSidebarOpen(false)}
            className="text-copy-muted hover:bg-bg-subtle hover:text-copy-primary"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center text-center">
          <p className="max-w-52 text-sm leading-6 text-copy-muted">
            AI chat placeholder
          </p>
        </div>
      </aside>

      <ProjectDialogs
        activeDialog={projectActions.activeDialog}
        projectName={projectActions.projectName}
        projectNameError={projectActions.projectNameError}
        slugPreview={projectActions.slugPreview}
        canSubmit={projectActions.canSubmit}
        isLoading={projectActions.isLoading}
        formError={projectActions.formError}
        onProjectNameChange={projectActions.setProjectName}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            projectActions.closeDialog()
          }
        }}
        onSubmit={projectActions.submitDialog}
      />

      <ShareDialog
        isOpen={isShareDialogOpen}
        projectId={project.id}
        projectName={project.name}
        canManage={canManageSharing}
        onOpenChange={setIsShareDialogOpen}
      />
    </div>
  )
}

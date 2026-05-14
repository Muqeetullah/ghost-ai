"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectDialogs } from "@/components/editor/project-dialogs"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { useProjectActions } from "@/hooks/use-project-actions"
import type { EditorProject } from "@/types/projects"

interface EditorScreenProps {
  ownedProjects: EditorProject[]
  sharedProjects: EditorProject[]
  activeProjectId?: string
}

export function EditorScreen({
  ownedProjects,
  sharedProjects,
  activeProjectId,
}: EditorScreenProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const projectActions = useProjectActions({ activeProjectId })
  const activeProject = [...ownedProjects, ...sharedProjects].find(
    (project) => project.id === activeProjectId
  )

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-base text-copy-primary">
      <EditorNavbar
        isSidebarOpen={isSidebarOpen}
        onSidebarToggle={() => setIsSidebarOpen((isOpen) => !isOpen)}
        centerContent={
          <span className="truncate text-sm font-medium text-copy-secondary">
            Ghost AI Editor
          </span>
        }
      />
      <ProjectSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        ownedProjects={ownedProjects}
        sharedProjects={sharedProjects}
        activeProjectId={activeProjectId}
        onCreateProject={projectActions.openCreateDialog}
        onRenameProject={projectActions.openRenameDialog}
        onDeleteProject={projectActions.openDeleteDialog}
      />

      <main className="relative min-h-0 flex-1 bg-base">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--border-default)_1px,transparent_1px)] bg-[length:24px_24px]" />
        <div className="relative flex h-full min-h-[calc(100vh-3.5rem)] items-center justify-center px-6 text-center">
          <div className="max-w-md">
            <h1 className="text-2xl font-semibold tracking-normal text-copy-primary">
              {activeProject?.name ?? "Create a project or open an existing one"}
            </h1>
            <p className="mt-3 text-sm leading-6 text-copy-muted">
              {activeProject
                ? "This workspace is ready for the next canvas feature."
                : "Start a new architecture workspace, or choose a project from the sidebar."}
            </p>
            <Button
              type="button"
              className="mt-6"
              onClick={projectActions.openCreateDialog}
            >
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </div>
        </div>
      </main>

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
    </div>
  )
}

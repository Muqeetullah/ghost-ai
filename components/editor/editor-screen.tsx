"use client"

import { useState } from "react"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectDialogs } from "@/components/editor/project-dialogs"
import {
  type MockProject,
  useProjectDialogs,
} from "@/components/editor/project-dialog-state"
import { ProjectSidebar } from "@/components/editor/project-sidebar"

const initialMockProjects: MockProject[] = [
  {
    id: "ghost-payments",
    name: "Payments Platform",
    slug: "payments-platform",
    ownerType: "owned",
    updatedAt: "Updated today",
  },
  {
    id: "realtime-analytics",
    name: "Realtime Analytics",
    slug: "realtime-analytics",
    ownerType: "owned",
    updatedAt: "Updated yesterday",
  },
  {
    id: "support-automation",
    name: "Support Automation",
    slug: "support-automation",
    ownerType: "shared",
    updatedAt: "Shared project",
  },
]

export function EditorScreen() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [projects, setProjects] = useState<MockProject[]>(initialMockProjects)
  const projectDialogs = useProjectDialogs()
  const ownedProjects = projects.filter(
    (project) => project.ownerType === "owned"
  )
  const sharedProjects = projects.filter(
    (project) => project.ownerType === "shared"
  )

  function handleProjectDialogSubmit() {
    projectDialogs.submitDialog((submittedValue, dialog) => {
      if (dialog.type === "create" && submittedValue) {
        setProjects((currentProjects) => [
          {
            id: `${submittedValue.slug}-${Date.now()}`,
            name: submittedValue.name,
            slug: submittedValue.slug,
            ownerType: "owned",
            updatedAt: "Updated just now",
          },
          ...currentProjects,
        ])
        setIsSidebarOpen(true)
        return
      }

      if (dialog.type === "rename" && dialog.project && submittedValue) {
        setProjects((currentProjects) =>
          currentProjects.map((project) =>
            project.id === dialog.project?.id
              ? {
                  ...project,
                  name: submittedValue.name,
                  slug: submittedValue.slug,
                  updatedAt: "Updated just now",
                }
              : project
          )
        )
        return
      }

      if (dialog.type === "delete" && dialog.project) {
        setProjects((currentProjects) =>
          currentProjects.filter((project) => project.id !== dialog.project?.id)
        )
      }
    })
  }

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
        onCreateProject={projectDialogs.openCreateDialog}
        onRenameProject={projectDialogs.openRenameDialog}
        onDeleteProject={projectDialogs.openDeleteDialog}
      />

      <main className="relative min-h-0 flex-1 bg-base">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--border-default)_1px,transparent_1px)] bg-[length:24px_24px]" />
        <div className="relative flex h-full min-h-[calc(100vh-3.5rem)] items-center justify-center px-6 text-center">
          <div className="max-w-md">
            <h1 className="text-2xl font-semibold tracking-normal text-copy-primary">
              Create a project or open an existing one
            </h1>
            <p className="mt-3 text-sm leading-6 text-copy-muted">
              Start a new architecture workspace, or choose a project from the
              sidebar.
            </p>
            <Button
              type="button"
              className="mt-6"
              onClick={projectDialogs.openCreateDialog}
            >
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </div>
        </div>
      </main>

      <ProjectDialogs
        activeDialog={projectDialogs.activeDialog}
        projectName={projectDialogs.projectName}
        projectNameError={projectDialogs.projectNameError}
        slugPreview={projectDialogs.slugPreview}
        canSubmit={projectDialogs.canSubmit}
        isLoading={projectDialogs.isLoading}
        onProjectNameChange={projectDialogs.setProjectName}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            projectDialogs.closeDialog()
          }
        }}
        onSubmit={handleProjectDialogSubmit}
      />
    </div>
  )
}

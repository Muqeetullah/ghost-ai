"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  LiveblocksProvider,
  RoomProvider,
} from "@liveblocks/react/suspense"
import { Bot, LayoutTemplate, Save, Share2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AiSidebar } from "@/components/editor/ai-sidebar"
import { CanvasRoom } from "@/components/editor/canvas-room"
import { EditorNavbar } from "@/components/editor/editor-navbar"
import { ProjectDialogs } from "@/components/editor/project-dialogs"
import { ProjectSidebar } from "@/components/editor/project-sidebar"
import { ShareDialog } from "@/components/editor/share-dialog"
import {
  type CanvasTemplate,
  type CanvasTemplateImport,
} from "@/components/editor/starter-templates"
import { StarterTemplatesModal } from "@/components/editor/starter-templates-modal"
import type { CanvasSaveStatus } from "@/hooks/use-canvas-autosave"
import { useProjectActions } from "@/hooks/use-project-actions"
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
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false)
  const [templateImport, setTemplateImport] =
    useState<CanvasTemplateImport | null>(null)
  const [canvasSaveStatus, setCanvasSaveStatus] =
    useState<CanvasSaveStatus>("saved")
  const [canvasSaveNow, setCanvasSaveNow] = useState<(() => void) | null>(null)
  const projectActions = useProjectActions({ activeProjectId: project.id })
  const canManageSharing = project.accessRole === "owner"

  const handleSaveNowChange = useCallback((saveNow: (() => void) | null) => {
    setCanvasSaveNow(() => saveNow)
  }, [])

  function handleTemplateImport(template: CanvasTemplate) {
    setTemplateImport((currentImport) => ({
      id: (currentImport?.id ?? 0) + 1,
      template,
    }))
  }

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-base text-copy-primary">
      <EditorNavbar
        isSidebarOpen={isProjectSidebarOpen}
        onSidebarToggle={() => setIsProjectSidebarOpen((isOpen) => !isOpen)}
        showUserButton={false}
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
            <CanvasSaveButton
              onSave={canvasSaveNow}
              status={canvasSaveStatus}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Import starter template"
              onClick={() => setIsTemplatesModalOpen(true)}
              className="text-copy-muted hover:bg-bg-subtle hover:text-copy-primary"
            >
              <LayoutTemplate className="h-4 w-4" />
              Templates
            </Button>
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

      <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
        <RoomProvider
          id={project.id}
          initialPresence={{ cursor: null, thinking: false }}
        >
          <main className="relative min-h-0 flex-1 overflow-hidden bg-base">
            <CanvasRoom
              onSaveNowChange={handleSaveNowChange}
              onSaveStatusChange={setCanvasSaveStatus}
              roomId={project.id}
              templateImport={templateImport}
            />
          </main>

          <AiSidebar
            isOpen={isAiSidebarOpen}
            onClose={() => setIsAiSidebarOpen(false)}
            roomId={project.id}
          />
        </RoomProvider>
      </LiveblocksProvider>

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

      <StarterTemplatesModal
        isOpen={isTemplatesModalOpen}
        onImport={handleTemplateImport}
        onOpenChange={setIsTemplatesModalOpen}
      />
    </div>
  )
}

interface CanvasSaveButtonProps {
  onSave: (() => void) | null
  status: CanvasSaveStatus
}

function CanvasSaveButton({ onSave, status }: CanvasSaveButtonProps) {
  const [label, setLabel] = useState("Save")
  const previousStatusRef = useRef<CanvasSaveStatus>(status)

  useEffect(() => {
    const previousStatus = previousStatusRef.current
    previousStatusRef.current = status
    const timeoutIds: number[] = []

    if (status === "saving") {
      timeoutIds.push(window.setTimeout(() => setLabel("Saving..."), 0))
    } else if (status === "error") {
      timeoutIds.push(window.setTimeout(() => setLabel("Error"), 0))
      timeoutIds.push(window.setTimeout(() => setLabel("Save"), 1400))
    } else if (previousStatus === "saving") {
      timeoutIds.push(window.setTimeout(() => setLabel("Saved"), 0))
      timeoutIds.push(window.setTimeout(() => setLabel("Save"), 1400))
    } else {
      timeoutIds.push(window.setTimeout(() => setLabel("Save"), 0))
    }

    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId))
    }
  }, [status])

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={`Save canvas: ${label}`}
      disabled={!onSave || status === "saving"}
      onClick={() => onSave?.()}
      className="min-w-24 text-copy-muted hover:bg-bg-subtle hover:text-copy-primary disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Save className="h-4 w-4" />
      {label}
    </Button>
  )
}

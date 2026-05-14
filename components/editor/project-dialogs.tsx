"use client"

import { FormEvent } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { EditorProject } from "@/types/projects"

type ActiveDialog =
  | { type: "create"; project?: EditorProject }
  | { type: "rename"; project?: EditorProject }
  | { type: "delete"; project?: EditorProject }
  | null

interface ProjectDialogsProps {
  activeDialog: ActiveDialog
  projectName: string
  projectNameError: string | null
  slugPreview: string
  canSubmit: boolean
  isLoading: boolean
  formError: string | null
  onProjectNameChange: (value: string) => void
  onOpenChange: (isOpen: boolean) => void
  onSubmit: () => void
}

export function ProjectDialogs({
  activeDialog,
  projectName,
  projectNameError,
  slugPreview,
  canSubmit,
  isLoading,
  formError,
  onProjectNameChange,
  onOpenChange,
  onSubmit,
}: ProjectDialogsProps) {
  const isOpen = activeDialog !== null
  const showProjectNameError =
    projectName.trim().length > 0 && projectNameError !== null

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!canSubmit || isLoading) {
      return
    }

    onSubmit()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden rounded-3xl border border-surface-border bg-bg-elevated p-0 text-copy-primary shadow-2xl ring-0 sm:max-w-md">
        {activeDialog?.type === "create" ? (
          <form onSubmit={handleSubmit}>
            <DialogHeader className="space-y-2 p-6 pr-12">
              <DialogTitle className="text-lg font-semibold text-copy-primary">
                Create Project
              </DialogTitle>
              <DialogDescription className="text-sm leading-6 text-copy-muted">
                Start a new architecture workspace.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 px-6 pb-6">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-copy-secondary">
                  Project name
                </span>
                <Input
                  value={projectName}
                  onChange={(event) => onProjectNameChange(event.target.value)}
                  placeholder="Payments Platform"
                  autoFocus
                  aria-invalid={showProjectNameError}
                  aria-describedby={
                    showProjectNameError
                      ? "create-project-name-error"
                      : undefined
                  }
                  className="h-10 border-surface-border-subtle bg-bg-subtle text-copy-primary placeholder:text-copy-faint"
                />
                {showProjectNameError ? (
                  <span
                    id="create-project-name-error"
                    className="block text-sm text-state-error"
                  >
                    {projectNameError}
                  </span>
                ) : null}
              </label>

              <div className="rounded-xl border border-surface-border bg-bg-subtle/70 px-3 py-2">
                <p className="text-xs font-medium uppercase text-copy-faint">
                  Room ID preview
                </p>
                <p
                  className={
                    showProjectNameError
                      ? "mt-1 font-mono text-sm text-copy-faint"
                      : "mt-1 font-mono text-sm text-brand"
                  }
                >
                  {showProjectNameError
                    ? "Fix the project name first"
                    : slugPreview}
                </p>
              </div>

              {formError ? (
                <p className="text-sm text-state-error">{formError}</p>
              ) : null}
            </div>

            <DialogFooter className="rounded-none border-surface-border bg-bg-subtle/50 p-6">
              <Button type="submit" disabled={!canSubmit || isLoading}>
                Create Project
              </Button>
            </DialogFooter>
          </form>
        ) : null}

        {activeDialog?.type === "rename" && activeDialog.project ? (
          <form onSubmit={handleSubmit}>
            <DialogHeader className="space-y-2 p-6 pr-12">
              <DialogTitle className="text-lg font-semibold text-copy-primary">
                Rename Project
              </DialogTitle>
              <DialogDescription className="text-sm leading-6 text-copy-muted">
                Current project: {activeDialog.project.name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 px-6 pb-6">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-copy-secondary">
                  Project name
                </span>
                <Input
                  value={projectName}
                  onChange={(event) => onProjectNameChange(event.target.value)}
                  autoFocus
                  aria-invalid={showProjectNameError}
                  aria-describedby={
                    showProjectNameError
                      ? "rename-project-name-error"
                      : undefined
                  }
                  className="h-10 border-surface-border-subtle bg-bg-subtle text-copy-primary"
                />
                {showProjectNameError ? (
                  <span
                    id="rename-project-name-error"
                    className="block text-sm text-state-error"
                  >
                    {projectNameError}
                  </span>
                ) : null}
              </label>

              {formError ? (
                <p className="text-sm text-state-error">{formError}</p>
              ) : null}
            </div>

            <DialogFooter className="rounded-none border-surface-border bg-bg-subtle/50 p-6">
              <Button type="submit" disabled={!canSubmit || isLoading}>
                Rename Project
              </Button>
            </DialogFooter>
          </form>
        ) : null}

        {activeDialog?.type === "delete" && activeDialog.project ? (
          <form onSubmit={handleSubmit}>
            <DialogHeader className="space-y-2 p-6 pr-12">
              <DialogTitle className="text-lg font-semibold text-copy-primary">
                Delete Project
              </DialogTitle>
              <DialogDescription className="text-sm leading-6 text-copy-muted">
                Delete {activeDialog.project.name}? This action cannot be
                undone.
              </DialogDescription>
            </DialogHeader>

            {formError ? (
              <div className="px-6 pb-6">
                <p className="text-sm text-state-error">{formError}</p>
              </div>
            ) : null}

            <DialogFooter className="rounded-none border-surface-border bg-bg-subtle/50 p-6">
              <Button type="submit" variant="destructive" disabled={isLoading}>
                Delete Project
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

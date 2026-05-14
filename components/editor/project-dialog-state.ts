"use client"

import { useMemo, useState } from "react"

export interface MockProject {
  id: string
  name: string
  slug: string
  ownerType: "owned" | "shared"
  updatedAt: string
}

type ProjectDialogType = "create" | "rename" | "delete"

export interface ProjectDialogState {
  type: ProjectDialogType
  project?: MockProject
}

export interface ProjectDialogSubmitValue {
  name: string
  slug: string
}

const VALID_PROJECT_NAME_PATTERN = /^[a-zA-Z0-9 ]+$/

export function createProjectSlug(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "")

  return slug || "untitled-project"
}

function getProjectNameError(value: string) {
  const trimmedValue = value.trim()

  if (trimmedValue.length === 0) {
    return "Project name is required."
  }

  if (!VALID_PROJECT_NAME_PATTERN.test(trimmedValue)) {
    return "Use letters, numbers, and spaces only."
  }

  return null
}

export function useProjectDialogs() {
  const [dialog, setDialog] = useState<ProjectDialogState | null>(null)
  const [projectName, setProjectName] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const projectNameError = useMemo(
    () => getProjectNameError(projectName),
    [projectName]
  )
  const slugPreview = useMemo(
    () => createProjectSlug(projectName),
    [projectName]
  )
  const canSubmit = dialog?.type === "delete" || projectNameError === null

  function openCreateDialog() {
    setProjectName("")
    setIsLoading(false)
    setDialog({ type: "create" })
  }

  function openRenameDialog(project: MockProject) {
    setProjectName(project.name)
    setIsLoading(false)
    setDialog({ type: "rename", project })
  }

  function openDeleteDialog(project: MockProject) {
    setProjectName("")
    setIsLoading(false)
    setDialog({ type: "delete", project })
  }

  function closeDialog() {
    if (isLoading) {
      return
    }

    setDialog(null)
  }

  function submitDialog(
    onSubmit?: (
      value: ProjectDialogSubmitValue | undefined,
      dialog: ProjectDialogState
    ) => void
  ) {
    if (!canSubmit) {
      return
    }

    setIsLoading(true)
    window.setTimeout(() => {
      if (dialog) {
        const submitValue =
          dialog.type === "delete"
            ? undefined
            : {
                name: projectName.trim(),
                slug: slugPreview,
              }

        onSubmit?.(submitValue, dialog)
      }

      setIsLoading(false)
      setDialog(null)
    }, 250)
  }

  return {
    activeDialog: dialog,
    projectName,
    setProjectName,
    projectNameError,
    slugPreview,
    canSubmit,
    isLoading,
    openCreateDialog,
    openRenameDialog,
    openDeleteDialog,
    closeDialog,
    submitDialog,
  }
}

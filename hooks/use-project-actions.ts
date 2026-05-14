"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { EditorProject } from "@/types/projects";

type ProjectDialogType = "create" | "rename" | "delete";

export interface ProjectDialogState {
  type: ProjectDialogType;
  project?: EditorProject;
}

interface UseProjectActionsOptions {
  activeProjectId?: string;
}

interface ProjectResponse {
  project: {
    id: string;
    name: string;
  };
}

const VALID_PROJECT_NAME_PATTERN = /^[a-zA-Z0-9 ]+$/;

export function useProjectActions({ activeProjectId }: UseProjectActionsOptions = {}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<ProjectDialogState | null>(null);
  const [projectName, setProjectName] = useState("");
  const [createSuffix, setCreateSuffix] = useState(() => createShortSuffix());
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const projectNameError = useMemo(() => getProjectNameError(projectName), [projectName]);
  const slugPreview = useMemo(() => createProjectSlug(projectName), [projectName]);
  const roomIdPreview = useMemo(
    () => `${slugPreview}-${createSuffix}`,
    [createSuffix, slugPreview]
  );
  const canSubmit = dialog?.type === "delete" || projectNameError === null;

  function openCreateDialog() {
    setProjectName("");
    setCreateSuffix(createShortSuffix());
    setFormError(null);
    setIsLoading(false);
    setDialog({ type: "create" });
  }

  function openRenameDialog(project: EditorProject) {
    setProjectName(project.name);
    setFormError(null);
    setIsLoading(false);
    setDialog({ type: "rename", project });
  }

  function openDeleteDialog(project: EditorProject) {
    setProjectName("");
    setFormError(null);
    setIsLoading(false);
    setDialog({ type: "delete", project });
  }

  function closeDialog() {
    if (isLoading) {
      return;
    }

    setDialog(null);
    setFormError(null);
  }

  async function submitDialog() {
    if (!dialog || !canSubmit || isLoading) {
      return;
    }

    setIsLoading(true);
    setFormError(null);

    try {
      if (dialog.type === "create") {
        await createProject();
      }

      if (dialog.type === "rename" && dialog.project) {
        await renameProject(dialog.project.id);
      }

      if (dialog.type === "delete" && dialog.project) {
        await deleteProject(dialog.project.id);
      }

      setDialog(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Project action failed.");
    } finally {
      setIsLoading(false);
    }
  }

  async function createProject() {
    const response = await fetch("/api/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: roomIdPreview,
        name: projectName.trim(),
      }),
    });
    const payload = await readProjectResponse(response);

    router.push(`/editor/${payload.project.id}`);
  }

  async function renameProject(projectId: string) {
    await readProjectResponse(
      await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: projectName.trim(),
        }),
      })
    );

    router.refresh();
  }

  async function deleteProject(projectId: string) {
    const response = await fetch(`/api/projects/${projectId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(await readErrorMessage(response));
    }

    if (activeProjectId === projectId) {
      router.push("/editor");
      return;
    }

    router.refresh();
  }

  return {
    activeDialog: dialog,
    projectName,
    setProjectName,
    projectNameError,
    slugPreview: dialog?.type === "create" ? roomIdPreview : slugPreview,
    canSubmit,
    isLoading,
    formError,
    openCreateDialog,
    openRenameDialog,
    openDeleteDialog,
    closeDialog,
    submitDialog,
  };
}

export function createProjectSlug(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "untitled-project";
}

function createShortSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

function getProjectNameError(value: string) {
  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    return "Project name is required.";
  }

  if (!VALID_PROJECT_NAME_PATTERN.test(trimmedValue)) {
    return "Use letters, numbers, and spaces only.";
  }

  return null;
}

async function readProjectResponse(response: Response): Promise<ProjectResponse> {
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as ProjectResponse;
}

async function readErrorMessage(response: Response) {
  const fallback = "Project action failed.";

  try {
    const payload = (await response.json()) as { error?: unknown };

    return typeof payload.error === "string" ? payload.error : fallback;
  } catch {
    return fallback;
  }
}

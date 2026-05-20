import { redirect } from "next/navigation"

import { AccessDenied } from "@/components/editor/access-denied"
import { DatabaseUnavailable } from "@/components/editor/database-unavailable"
import { WorkspaceShell } from "@/components/editor/workspace-shell"
import { isDatabaseUnavailableError } from "@/lib/database-errors"
import {
  getAccessibleProject,
  getCurrentClerkIdentity,
} from "@/lib/project-access"
import { getEditorProjectLists } from "@/lib/projects"

const signInUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL ?? "/sign-in"

export default async function ProjectWorkspacePage({
  params,
}: {
  params: Promise<{ roomId: string }>
}) {
  const { roomId } = await params
  const identity = await getCurrentClerkIdentity()

  if (!identity.userId) {
    redirect(signInUrl)
  }

  let project
  let projectLists

  try {
    project = await getAccessibleProject(roomId, {
      userId: identity.userId,
      primaryEmail: identity.primaryEmail,
    })

    projectLists = await getEditorProjectLists()
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return <DatabaseUnavailable />
    }

    throw error
  }

  if (!project) {
    return <AccessDenied />
  }

  return <WorkspaceShell project={project} {...projectLists} />
}

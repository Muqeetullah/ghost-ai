import { redirect } from "next/navigation"

import { AccessDenied } from "@/components/editor/access-denied"
import { WorkspaceShell } from "@/components/editor/workspace-shell"
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

  const project = await getAccessibleProject(roomId, {
    userId: identity.userId,
    primaryEmail: identity.primaryEmail,
  })

  if (!project) {
    return <AccessDenied />
  }

  const projectLists = await getEditorProjectLists()

  return <WorkspaceShell project={project} {...projectLists} />
}

import {
  getAccessibleProject,
  getCurrentClerkIdentity,
} from "@/lib/project-access"
import { prisma } from "@/lib/prisma"
import { jsonError } from "../../../_lib/project-api"

export async function DELETE(
  _request: Request,
  context: RouteContext<"/api/projects/[projectId]/collaborators/[collaboratorId]">
) {
  const { projectId, collaboratorId } = await context.params
  const identity = await getCurrentClerkIdentity()

  if (!identity.userId) {
    return jsonError("Unauthorized", 401)
  }

  const project = await getAccessibleProject(projectId, {
    userId: identity.userId,
    primaryEmail: identity.primaryEmail,
  })

  if (!project) {
    return jsonError("Project not found", 404)
  }

  if (project.accessRole !== "owner") {
    return jsonError("Forbidden", 403)
  }

  const { count } = await prisma.projectCollaborator.deleteMany({
    where: {
      id: collaboratorId,
      projectId,
    },
  })

  if (count === 0) {
    return jsonError("Collaborator not found", 404)
  }

  return new Response(null, { status: 204 })
}

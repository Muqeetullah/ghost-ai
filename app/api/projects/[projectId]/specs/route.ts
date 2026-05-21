import { jsonError } from "@/app/api/projects/_lib/project-api"
import {
  getAccessibleProject,
  getCurrentClerkIdentity,
} from "@/lib/project-access"
import { prisma } from "@/lib/prisma"
import { getProjectSpecFilename } from "@/lib/project-specs"

export async function GET(
  _request: Request,
  context: ProjectSpecsRouteContext
) {
  const accessResult = await getProjectAccess(context)

  if (accessResult instanceof Response) {
    return accessResult
  }

  const specs = await prisma.projectSpec.findMany({
    where: {
      projectId: accessResult.projectId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      createdAt: true,
      filePath: true,
      id: true,
    },
  })

  return Response.json({
    specs: specs.map((spec) => ({
      createdAt: spec.createdAt.toISOString(),
      filename: getProjectSpecFilename(spec.filePath, spec.id),
      id: spec.id,
    })),
  })
}

interface ProjectSpecsRouteContext {
  params: Promise<{
    projectId: string
  }>
}

async function getProjectAccess(
  context: ProjectSpecsRouteContext
): Promise<{ projectId: string } | Response> {
  const identity = await getCurrentClerkIdentity()

  if (!identity.userId) {
    return jsonError("Unauthorized", 401)
  }

  const { projectId } = await context.params
  const project = await getAccessibleProject(projectId, {
    userId: identity.userId,
    primaryEmail: identity.primaryEmail,
  })

  if (!project) {
    return jsonError("Forbidden", 403)
  }

  return { projectId }
}

import { get } from "@vercel/blob"

import { jsonError } from "@/app/api/projects/_lib/project-api"
import {
  getAccessibleProject,
  getCurrentClerkIdentity,
} from "@/lib/project-access"
import { prisma } from "@/lib/prisma"
import { getProjectSpecFilename } from "@/lib/project-specs"

export async function GET(
  _request: Request,
  context: ProjectSpecRouteContext
) {
  const accessResult = await getProjectSpecAccess(context)

  if (accessResult instanceof Response) {
    return accessResult
  }

  const projectSpec = await prisma.projectSpec.findUnique({
    where: {
      id: accessResult.specId,
    },
    select: {
      createdAt: true,
      filePath: true,
      id: true,
      projectId: true,
    },
  })

  if (!projectSpec || projectSpec.projectId !== accessResult.projectId) {
    return jsonError("Spec not found", 404)
  }

  const blob = await get(projectSpec.filePath, {
    access: "private",
    useCache: false,
  })

  if (!blob || blob.statusCode !== 200) {
    return jsonError("Spec file not found", 404)
  }

  return Response.json({
    content: await new Response(blob.stream).text(),
    createdAt: projectSpec.createdAt.toISOString(),
    filename: getProjectSpecFilename(projectSpec.filePath, projectSpec.id),
    id: projectSpec.id,
  })
}

interface ProjectSpecRouteContext {
  params: Promise<{
    projectId: string
    specId: string
  }>
}

async function getProjectSpecAccess(
  context: ProjectSpecRouteContext
): Promise<{ projectId: string; specId: string } | Response> {
  const identity = await getCurrentClerkIdentity()

  if (!identity.userId) {
    return jsonError("Unauthorized", 401)
  }

  const { projectId, specId } = await context.params
  const project = await getAccessibleProject(projectId, {
    userId: identity.userId,
    primaryEmail: identity.primaryEmail,
  })

  if (!project) {
    return jsonError("Forbidden", 403)
  }

  return {
    projectId,
    specId,
  }
}

import { get } from "@vercel/blob"

import { jsonError } from "@/app/api/projects/_lib/project-api"
import { prisma } from "@/lib/prisma"
import { buildProjectSpecDownloadFilename } from "@/lib/project-specs"
import {
  getAccessibleProject,
  getCurrentClerkIdentity,
} from "@/lib/project-access"

export async function GET(
  _request: Request,
  context: DownloadProjectSpecRouteContext
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

  if (!blob || blob.statusCode !== 200 || !blob.stream) {
    return jsonError("Spec file not found", 404)
  }

  const filename = buildProjectSpecDownloadFilename(
    accessResult.projectName,
    projectSpec.id
  )

  return new Response(blob.stream, {
    headers: {
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": "text/markdown; charset=utf-8",
    },
  })
}

interface DownloadProjectSpecAccess {
  projectId: string
  projectName: string
  specId: string
}

interface DownloadProjectSpecRouteContext {
  params: Promise<{
    projectId: string
    specId: string
  }>
}

async function getProjectSpecAccess(
  context: DownloadProjectSpecRouteContext
): Promise<DownloadProjectSpecAccess | Response> {
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
    projectName: project.name,
    specId,
  }
}

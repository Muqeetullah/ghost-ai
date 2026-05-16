import { get, put } from "@vercel/blob"

import { jsonError } from "@/app/api/projects/_lib/project-api"
import { prisma } from "@/lib/prisma"
import {
  getAccessibleProject,
  getCurrentClerkIdentity,
} from "@/lib/project-access"
import type { CanvasSnapshot } from "@/types/canvas"

export async function GET(
  _request: Request,
  context: CanvasRouteContext
) {
  const accessResult = await getCanvasProjectAccess(context)

  if (accessResult instanceof Response) {
    return accessResult
  }

  const project = await prisma.project.findUnique({
    where: {
      id: accessResult.projectId,
    },
    select: {
      canvasJsonPath: true,
    },
  })

  if (!project) {
    return jsonError("Project not found", 404)
  }

  if (!project.canvasJsonPath) {
    return Response.json({ canvas: null })
  }

  const blob = await get(project.canvasJsonPath, {
    access: "private",
    useCache: false,
  })

  if (!blob || blob.statusCode === 304 || !blob.stream) {
    return Response.json({ canvas: null })
  }

  const canvas = parseCanvasSnapshot(await readStreamText(blob.stream))

  if (!canvas) {
    return jsonError("Saved canvas JSON is invalid", 502)
  }

  return Response.json({ canvas })
}

export async function PUT(
  request: Request,
  context: CanvasRouteContext
) {
  const accessResult = await getCanvasProjectAccess(context)

  if (accessResult instanceof Response) {
    return accessResult
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return jsonError("Request body must be valid JSON", 400)
  }

  const canvas = parseCanvasSnapshot(body)

  if (!canvas) {
    return jsonError("Canvas payload must include nodes and edges arrays", 400)
  }

  const blob = await put(
    `canvas/${accessResult.projectId}.json`,
    JSON.stringify(canvas),
    {
      access: "private",
      allowOverwrite: true,
      contentType: "application/json",
    }
  )

  await prisma.project.update({
    where: {
      id: accessResult.projectId,
    },
    data: {
      canvasJsonPath: blob.url,
    },
  })

  return Response.json({
    canvasJsonPath: blob.url,
    savedAt: new Date().toISOString(),
  })
}

interface CanvasProjectAccess {
  projectId: string
}

interface CanvasRouteContext {
  params: Promise<{
    projectId: string
  }>
}

async function getCanvasProjectAccess(
  context: CanvasRouteContext
): Promise<CanvasProjectAccess | Response> {
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
    return jsonError("Project not found", 404)
  }

  return { projectId }
}

function parseCanvasSnapshot(value: unknown): CanvasSnapshot | null {
  if (typeof value === "string") {
    try {
      return parseCanvasSnapshot(JSON.parse(value))
    } catch {
      return null
    }
  }

  if (!isRecord(value) || !Array.isArray(value.nodes) || !Array.isArray(value.edges)) {
    return null
  }

  return {
    nodes: value.nodes as CanvasSnapshot["nodes"],
    edges: value.edges as CanvasSnapshot["edges"],
  }
}

async function readStreamText(stream: ReadableStream<Uint8Array>) {
  const response = new Response(stream)

  return response.text()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

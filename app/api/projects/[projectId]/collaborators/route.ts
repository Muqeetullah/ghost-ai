import { clerkClient } from "@clerk/nextjs/server"
import { Prisma } from "@/generated/prisma/client"

import {
  getAccessibleProject,
  getCurrentClerkIdentity,
} from "@/lib/project-access"
import { prisma } from "@/lib/prisma"
import { jsonError } from "../../_lib/project-api"

interface CollaboratorResponse {
  id: string
  email: string
  displayName: string | null
  avatarUrl: string | null
  createdAt: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function GET(
  _request: Request,
  context: RouteContext<"/api/projects/[projectId]/collaborators">
) {
  const { projectId } = await context.params
  const accessResult = await getCollaboratorRouteAccess(projectId)

  if (accessResult instanceof Response) {
    return accessResult
  }

  const collaborators = await prisma.projectCollaborator.findMany({
    where: {
      projectId,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      email: true,
      createdAt: true,
    },
  })

  return Response.json({
    canManage: accessResult.project.accessRole === "owner",
    collaborators: await enrichCollaborators(collaborators),
  })
}

export async function POST(
  request: Request,
  context: RouteContext<"/api/projects/[projectId]/collaborators">
) {
  const { projectId } = await context.params
  const accessResult = await getCollaboratorRouteAccess(projectId)

  if (accessResult instanceof Response) {
    return accessResult
  }

  if (accessResult.project.accessRole !== "owner") {
    return jsonError("Forbidden", 403)
  }

  const body = await parseInviteRequest(request)

  if (body instanceof Response) {
    return body
  }

  if (body.email === accessResult.identity.primaryEmail) {
    return jsonError("Project owners already have access", 400)
  }

  try {
    const collaborator = await prisma.projectCollaborator.create({
      data: {
        projectId,
        email: body.email,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    })

    const [enrichedCollaborator] = await enrichCollaborators([collaborator])

    return Response.json({ collaborator: enrichedCollaborator }, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("Collaborator already has access", 409)
    }

    throw error
  }
}

async function getCollaboratorRouteAccess(projectId: string) {
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

  return {
    identity: {
      userId: identity.userId,
      primaryEmail: identity.primaryEmail,
    },
    project,
  }
}

async function parseInviteRequest(request: Request): Promise<{ email: string } | Response> {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    body = {}
  }

  if (!isRecord(body) || typeof body.email !== "string") {
    return jsonError("Collaborator email is required", 400)
  }

  const email = body.email.trim().toLowerCase()

  if (!EMAIL_PATTERN.test(email)) {
    return jsonError("Enter a valid email address", 400)
  }

  return { email }
}

async function enrichCollaborators(
  collaborators: Array<{ id: string; email: string; createdAt: Date }>
): Promise<CollaboratorResponse[]> {
  const emails = collaborators.map((collaborator) => collaborator.email)
  const usersByEmail = await getClerkUsersByEmail(emails)

  return collaborators.map((collaborator) => {
    const user = usersByEmail.get(collaborator.email)
    const displayName = user
      ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || null
      : null

    return {
      id: collaborator.id,
      email: collaborator.email,
      displayName,
      avatarUrl: user?.imageUrl ?? null,
      createdAt: collaborator.createdAt.toISOString(),
    }
  })
}

async function getClerkUsersByEmail(emails: string[]) {
  const usersByEmail = new Map<
    string,
    {
      firstName: string | null
      lastName: string | null
      username: string | null
      imageUrl: string
    }
  >()

  if (emails.length === 0) {
    return usersByEmail
  }

  const emailSet = new Set(emails)

  try {
    const client = await clerkClient()
    const userList = await client.users.getUserList({
      emailAddress: emails,
      limit: Math.max(emails.length, 1),
    })

    for (const user of userList.data) {
      for (const emailAddress of user.emailAddresses) {
        const normalizedEmail = emailAddress.emailAddress.toLowerCase()

        if (emailSet.has(normalizedEmail)) {
          usersByEmail.set(normalizedEmail, {
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            imageUrl: user.imageUrl,
          })
        }
      }
    }
  } catch {
    return usersByEmail
  }

  return usersByEmail
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

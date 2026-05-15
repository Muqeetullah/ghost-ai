import "server-only"

import { auth, currentUser } from "@clerk/nextjs/server"

import { prisma } from "@/lib/prisma"

export interface ClerkProjectIdentity {
  userId: string | null
  primaryEmail: string | null
}

export interface AuthenticatedProjectIdentity {
  userId: string
  primaryEmail: string | null
}

export type ProjectAccessRole = "owner" | "collaborator"

export interface AccessibleProject {
  id: string
  name: string
  ownerId: string
  accessRole: ProjectAccessRole
}

export async function getCurrentClerkIdentity(): Promise<ClerkProjectIdentity> {
  const { userId } = await auth()

  if (!userId) {
    return {
      userId: null,
      primaryEmail: null,
    }
  }

  const user = await currentUser()
  const primaryEmail = user?.primaryEmailAddress
  const verifiedPrimaryEmail =
    primaryEmail?.verification?.status === "verified"
      ? primaryEmail.emailAddress.toLowerCase()
      : null

  return {
    userId,
    primaryEmail: verifiedPrimaryEmail,
  }
}

export async function getAccessibleProject(
  projectId: string,
  identity: AuthenticatedProjectIdentity
): Promise<AccessibleProject | null> {
  const collaboratorEmail = identity.primaryEmail ?? "__no_collaborator_match__"

  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      id: true,
      name: true,
      ownerId: true,
      collaborators: {
        where: {
          email: collaboratorEmail,
        },
        select: {
          id: true,
        },
        take: 1,
      },
    },
  })

  if (!project) {
    return null
  }

  if (project.ownerId === identity.userId) {
    return {
      id: project.id,
      name: project.name,
      ownerId: project.ownerId,
      accessRole: "owner",
    }
  }

  if (project.collaborators.length > 0) {
    return {
      id: project.id,
      name: project.name,
      ownerId: project.ownerId,
      accessRole: "collaborator",
    }
  }

  return null
}

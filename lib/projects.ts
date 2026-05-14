import "server-only";

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import type { Project } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { EditorProject, EditorProjectLists } from "@/types/projects";

type ProjectSummary = Pick<Project, "id" | "name" | "updatedAt">;

export async function getEditorProjectLists(): Promise<EditorProjectLists> {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();
  const collaboratorEmails =
    user?.emailAddresses.map((email) => email.emailAddress.toLowerCase()) ?? [];

  const [ownedProjects, sharedProjects] = await Promise.all([
    prisma.project.findMany({
      where: {
        ownerId: userId,
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        name: true,
        updatedAt: true,
      },
    }),
    collaboratorEmails.length > 0
      ? prisma.project.findMany({
          where: {
            ownerId: {
              not: userId,
            },
            collaborators: {
              some: {
                email: {
                  in: collaboratorEmails,
                },
              },
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
          select: {
            id: true,
            name: true,
            updatedAt: true,
          },
        })
      : Promise.resolve([]),
  ]);

  return {
    ownedProjects: ownedProjects.map((project) => serializeEditorProject(project, "owned")),
    sharedProjects: sharedProjects.map((project) => serializeEditorProject(project, "shared")),
  };
}

function serializeEditorProject(
  project: ProjectSummary,
  ownerType: EditorProject["ownerType"]
): EditorProject {
  return {
    id: project.id,
    name: project.name,
    slug: project.id,
    ownerType,
    updatedAt: formatUpdatedAt(project.updatedAt),
  };
}

function formatUpdatedAt(value: Date) {
  return `Updated ${new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value)}`;
}

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

import {
  getAuthenticatedUser,
  parseProjectName,
  serializeProject,
} from "./_lib/project-api";

const DEFAULT_PROJECT_NAME = "Untitled Project";

export async function GET() {
  const authResult = await getAuthenticatedUser();

  if (authResult instanceof Response) {
    return authResult;
  }

  const projects = await prisma.project.findMany({
    where: {
      ownerId: authResult.userId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return Response.json({
    projects: projects.map(serializeProject),
  });
}

export async function POST(request: Request) {
  const authResult = await getAuthenticatedUser();

  if (authResult instanceof Response) {
    return authResult;
  }

  const body = await parseProjectName(request, DEFAULT_PROJECT_NAME);

  if (body instanceof Response) {
    return body;
  }

  let project;

  try {
    project = await prisma.project.create({
      data: {
        id: body.id,
        ownerId: authResult.userId,
        name: body.name,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json({ error: "Project ID already exists" }, { status: 409 });
    }

    throw error;
  }

  return Response.json({ project: serializeProject(project) }, { status: 201 });
}

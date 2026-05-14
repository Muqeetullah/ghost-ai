import { prisma } from "@/lib/prisma";

import {
  getAuthenticatedUser,
  jsonError,
  parseProjectName,
  serializeProject,
} from "../_lib/project-api";

export async function PATCH(request: Request, context: RouteContext<"/api/projects/[projectId]">) {
  const authResult = await getAuthenticatedUser();

  if (authResult instanceof Response) {
    return authResult;
  }

  const body = await parseProjectName(request);

  if (body instanceof Response) {
    return body;
  }

  const { projectId } = await context.params;
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      ownerId: true,
    },
  });

  if (!project) {
    return jsonError("Project not found", 404);
  }

  if (project.ownerId !== authResult.userId) {
    return jsonError("Forbidden", 403);
  }

  const updatedProject = await prisma.project.update({
    where: {
      id: projectId,
    },
    data: {
      name: body.name,
    },
  });

  return Response.json({ project: serializeProject(updatedProject) });
}

export async function DELETE(_request: Request, context: RouteContext<"/api/projects/[projectId]">) {
  const authResult = await getAuthenticatedUser();

  if (authResult instanceof Response) {
    return authResult;
  }

  const { projectId } = await context.params;
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      ownerId: true,
    },
  });

  if (!project) {
    return jsonError("Project not found", 404);
  }

  if (project.ownerId !== authResult.userId) {
    return jsonError("Forbidden", 403);
  }

  await prisma.project.delete({
    where: {
      id: projectId,
    },
  });

  return new Response(null, { status: 204 });
}

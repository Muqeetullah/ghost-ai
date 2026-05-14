import { auth } from "@clerk/nextjs/server";

import type { Project } from "@/generated/prisma/client";

export interface ProjectResponse {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  status: Project["status"];
  canvasJsonPath: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProjectNameInput {
  name: string;
  id?: string;
}

interface AuthenticatedUser {
  userId: string;
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | Response> {
  const { userId } = await auth();

  if (!userId) {
    return jsonError("Unauthorized", 401);
  }

  return { userId };
}

export async function parseProjectName(
  request: Request,
  fallbackName?: string
): Promise<ProjectNameInput | Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (!isRecord(body)) {
    return jsonError("Request body must be a JSON object", 400);
  }

  if ("id" in body && body.id !== undefined && body.id !== null && typeof body.id !== "string") {
    return jsonError("Project ID must be a string", 400);
  }

  const id = typeof body.id === "string" ? body.id.trim() : undefined;

  if (id && !/^[a-z0-9-]+$/.test(id)) {
    return jsonError("Project ID must use lowercase letters, numbers, and hyphens", 400);
  }

  if (!("name" in body) || body.name === undefined || body.name === null) {
    return fallbackName ? { id, name: fallbackName } : jsonError("Project name is required", 400);
  }

  if (typeof body.name !== "string") {
    return jsonError("Project name must be a string", 400);
  }

  const name = body.name.trim();

  if (!name) {
    return fallbackName ? { id, name: fallbackName } : jsonError("Project name is required", 400);
  }

  return { id, name };
}

export function serializeProject(project: Project): ProjectResponse {
  return {
    id: project.id,
    ownerId: project.ownerId,
    name: project.name,
    description: project.description,
    status: project.status,
    canvasJsonPath: project.canvasJsonPath,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

export function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

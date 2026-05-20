import { tasks } from "@trigger.dev/sdk/v3";

import { jsonError } from "@/app/api/projects/_lib/project-api";
import { prisma } from "@/lib/prisma";
import {
  getAccessibleProject,
  getCurrentClerkIdentity,
} from "@/lib/project-access";
import type { designAgent } from "@/trigger/design-agent";

interface DesignRequestBody {
  prompt: string;
  projectId: string;
  roomId: string;
}

export async function POST(request: Request) {
  const body = await parseDesignRequest(request);

  if (body instanceof Response) {
    return body;
  }

  const identity = await getCurrentClerkIdentity();

  if (!identity.userId) {
    return jsonError("Unauthorized", 401);
  }

  const project = await getAccessibleProject(body.projectId, {
    userId: identity.userId,
    primaryEmail: identity.primaryEmail,
  });

  if (!project) {
    return jsonError("Forbidden", 403);
  }

  if (body.roomId !== project.id) {
    return jsonError("Room does not match project", 400);
  }

  const handle = await tasks.trigger<typeof designAgent>("design-agent", {
    projectId: project.id,
    prompt: body.prompt,
    roomId: body.roomId,
  });

  await prisma.taskRun.create({
    data: {
      runId: handle.id,
      projectId: project.id,
      userId: identity.userId,
    },
  });

  return Response.json({ runId: handle.id }, { status: 201 });
}

async function parseDesignRequest(
  request: Request
): Promise<DesignRequestBody | Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON", 400);
  }

  if (!isRecord(body)) {
    return jsonError("Request body must be a JSON object", 400);
  }

  const prompt = parseRequiredString(body.prompt);
  const projectId = parseRequiredString(body.projectId);
  const roomId = parseRequiredString(body.roomId);

  if (!prompt) {
    return jsonError("Design prompt is required", 400);
  }

  if (!projectId) {
    return jsonError("Project ID is required", 400);
  }

  if (!roomId) {
    return jsonError("Room ID is required", 400);
  }

  return { prompt, projectId, roomId };
}

function parseRequiredString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

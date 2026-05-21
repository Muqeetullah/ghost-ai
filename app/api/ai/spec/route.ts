import { tasks } from "@trigger.dev/sdk";

import { jsonError } from "@/app/api/projects/_lib/project-api";
import { prisma } from "@/lib/prisma";
import { getAccessibleProject, getCurrentClerkIdentity } from "@/lib/project-access";
import {
  normalizeSpecChatHistory,
  specGenerationRequestSchema,
} from "@/lib/spec-generation";
import type { generateSpec } from "@/trigger/generate-spec";

export async function POST(request: Request) {
  const body = await parseSpecGenerationRequest(request);

  if (body instanceof Response) {
    return body;
  }

  const identity = await getCurrentClerkIdentity();

  if (!identity.userId) {
    return jsonError("Unauthorized", 401);
  }

  const project = await getAccessibleProject(body.roomId, {
    userId: identity.userId,
    primaryEmail: identity.primaryEmail,
  });

  if (!project) {
    return jsonError("Forbidden", 403);
  }

  const normalizedChatHistory = normalizeSpecChatHistory(body.chatHistory);

  const handle = await tasks.trigger<typeof generateSpec>("generate-spec", {
    chatHistory: normalizedChatHistory,
    edges: body.edges,
    nodes: body.nodes,
    projectId: project.id,
    roomId: body.roomId,
  });

  await prisma.taskRun.create({
    data: {
      projectId: project.id,
      runId: handle.id,
      userId: identity.userId,
    },
  });

  return Response.json({ runId: handle.id }, { status: 201 });
}

async function parseSpecGenerationRequest(
  request: Request
) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON", 400);
  }

  const result = specGenerationRequestSchema.safeParse(body);

  if (!result.success) {
    return jsonError("Invalid spec generation request payload", 400);
  }

  return result.data;
}

import { createHash } from "node:crypto";

import { idempotencyKeys, runs, tasks } from "@trigger.dev/sdk";

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

const MAX_PROMPT_LENGTH = 2000;
const DESIGN_IDEMPOTENCY_KEY_TTL = "1h";

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

  const idempotencyKey = await idempotencyKeys.create(
    [
      "design-agent",
      "project",
      project.id,
      "user",
      identity.userId,
      "payload",
      hashDesignRequest({
        projectId: project.id,
        prompt: body.prompt,
        roomId: body.roomId,
      }),
    ],
    { scope: "global" }
  );

  const handle = await tasks.trigger<typeof designAgent>(
    "design-agent",
    {
      projectId: project.id,
      prompt: body.prompt,
      roomId: body.roomId,
    },
    {
      idempotencyKey,
      idempotencyKeyTTL: DESIGN_IDEMPOTENCY_KEY_TTL,
    }
  );

  try {
    await prisma.taskRun.create({
      data: {
        runId: handle.id,
        projectId: project.id,
        userId: identity.userId,
      },
    });
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      return Response.json({ runId: handle.id }, { status: 201 });
    }

    console.error("Failed to persist design-agent task run", {
      error,
      projectId: project.id,
      runId: handle.id,
      userId: identity.userId,
    });

    try {
      await runs.cancel(handle.id);
    } catch (cancelError) {
      console.error("Failed to cancel untracked design-agent run", {
        error: cancelError,
        runId: handle.id,
      });
    }

    return jsonError("Unable to persist design run", 500);
  }

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

  if (prompt.length > MAX_PROMPT_LENGTH) {
    return jsonError(
      `Design prompt exceeds maximum length of ${MAX_PROMPT_LENGTH} characters`,
      400
    );
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

function hashDesignRequest(value: DesignRequestBody) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function isPrismaUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

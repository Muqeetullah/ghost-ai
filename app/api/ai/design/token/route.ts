import { auth as triggerAuth } from "@trigger.dev/sdk";

import { jsonError } from "@/app/api/projects/_lib/project-api";
import { prisma } from "@/lib/prisma";
import { getCurrentClerkIdentity } from "@/lib/project-access";

interface DesignTokenRequestBody {
  runId: string;
}

export async function POST(request: Request) {
  const body = await parseDesignTokenRequest(request);

  if (body instanceof Response) {
    return body;
  }

  const identity = await getCurrentClerkIdentity();

  if (!identity.userId) {
    return jsonError("Unauthorized", 401);
  }

  const taskRun = await prisma.taskRun.findUnique({
    where: {
      runId: body.runId,
    },
    select: {
      userId: true,
    },
  });

  if (!taskRun || taskRun.userId !== identity.userId) {
    return jsonError("Run not found", 404);
  }

  const token = await triggerAuth.createPublicToken({
    scopes: {
      read: {
        runs: body.runId,
      },
    },
  });

  return Response.json({ token });
}

async function parseDesignTokenRequest(
  request: Request
): Promise<DesignTokenRequestBody | Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON", 400);
  }

  if (!isRecord(body) || typeof body.runId !== "string") {
    return jsonError("Run ID is required", 400);
  }

  const runId = body.runId.trim();

  if (!runId) {
    return jsonError("Run ID is required", 400);
  }

  return { runId };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

import { auth as triggerAuth } from "@trigger.dev/sdk";

import { jsonError } from "@/app/api/projects/_lib/project-api";
import { prisma } from "@/lib/prisma";
import { getCurrentClerkIdentity } from "@/lib/project-access";
import { z } from "zod";

const specTokenRequestSchema = z.object({
  runId: z.string().trim().min(1),
});

export async function POST(request: Request) {
  const body = await parseSpecTokenRequest(request);

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
    expirationTime: "1h",
    scopes: {
      read: {
        runs: [body.runId],
      },
    },
  });

  return Response.json({ token });
}

async function parseSpecTokenRequest(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON", 400);
  }

  const result = specTokenRequestSchema.safeParse(body);

  if (!result.success) {
    return jsonError("Run ID is required", 400);
  }

  return result.data;
}

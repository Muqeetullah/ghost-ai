import { currentUser } from "@clerk/nextjs/server"

import { jsonError } from "@/app/api/projects/_lib/project-api"
import { ensureLiveblocksFeed } from "@/lib/liveblocks-feeds"
import { getLiveblocksClient, getLiveblocksUserColor } from "@/lib/liveblocks"
import {
  getAccessibleProject,
  getCurrentClerkIdentity,
} from "@/lib/project-access"
import { AI_CHAT_FEED_ID, AI_STATUS_FEED_ID } from "@/types/tasks"

interface LiveblocksAuthRequest {
  room: string
}

export async function POST(request: Request) {
  const body = await parseLiveblocksAuthRequest(request)

  if (body instanceof Response) {
    return body
  }

  const identity = await getCurrentClerkIdentity()

  if (!identity.userId) {
    return jsonError("Unauthorized", 401)
  }

  const project = await getAccessibleProject(body.room, {
    userId: identity.userId,
    primaryEmail: identity.primaryEmail,
  })

  if (!project) {
    return jsonError("Forbidden", 403)
  }

  const liveblocks = getLiveblocksClient()
  await liveblocks.getOrCreateRoom(project.id, {
    defaultAccesses: [],
    metadata: {
      projectId: project.id,
      projectName: project.name,
    },
  })
  await ensureLiveblocksFeed(liveblocks, {
    feedId: AI_STATUS_FEED_ID,
    metadata: {
      name: "AI status feed",
    },
    roomId: project.id,
  })
  await ensureLiveblocksFeed(liveblocks, {
    feedId: AI_CHAT_FEED_ID,
    metadata: {
      name: "AI chat feed",
    },
    roomId: project.id,
  })

  const user = await currentUser()
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    identity.primaryEmail ||
    "Ghost AI User"
  const cursorColor = getLiveblocksUserColor(identity.userId)
  const session = liveblocks.prepareSession(identity.userId, {
    userInfo: {
      name: displayName,
      avatar: user?.imageUrl ?? "",
      color: cursorColor,
    },
  })

  session.allow(project.id, session.FULL_ACCESS)

  const { status, body: responseBody } = await session.authorize()

  return new Response(responseBody, { status })
}

async function parseLiveblocksAuthRequest(
  request: Request
): Promise<LiveblocksAuthRequest | Response> {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    body = {}
  }

  if (!isRecord(body) || typeof body.room !== "string") {
    return jsonError("Liveblocks room is required", 400)
  }

  const room = body.room.trim()

  if (!room) {
    return jsonError("Liveblocks room is required", 400)
  }

  return { room }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

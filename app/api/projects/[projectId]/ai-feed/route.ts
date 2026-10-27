import { jsonError } from "@/app/api/projects/_lib/project-api"
import { getLiveblocksClient } from "@/lib/liveblocks"
import { getAccessibleProject, getCurrentClerkIdentity } from "@/lib/project-access"
import { AI_CHAT_FEED_ID, AI_STATUS_FEED_ID } from "@/types/tasks"

export async function GET(request: Request, context: { params: Promise<{ projectId: string }> }) {
  const identity = await getCurrentClerkIdentity()
  if (!identity.userId) return jsonError("Unauthorized", 401)

  const { projectId } = await context.params
  const project = await getAccessibleProject(projectId, {
    userId: identity.userId,
    primaryEmail: identity.primaryEmail,
  })
  if (!project) return jsonError("Forbidden", 403)

  const feedId = new URL(request.url).searchParams.get("feed")
  if (feedId !== AI_CHAT_FEED_ID && feedId !== AI_STATUS_FEED_ID) {
    return jsonError("Invalid AI feed", 400)
  }

  try {
    const { data } = await getLiveblocksClient().getFeedMessages({ roomId: project.id, feedId })
    return Response.json({ messages: data }, { headers: { "Cache-Control": "private, no-store" } })
  } catch {
    return jsonError("Could not load AI messages. Please try again.", 502)
  }
}

import type { JsonObject } from "@liveblocks/client"
import { z } from "zod"

export const AI_CHAT_FEED_ID = "ai-chat-feed"
export const AI_STATUS_FEED_ID = "ai-status-feed"

export type AiStatusKind = "start" | "processing" | "complete" | "error"
export type AiChatRole = "user" | "assistant"

export interface AiChatFeedPayload extends JsonObject {
  content: string
  role: AiChatRole
  sender: string
  timestamp: string
  type: "ai-chat"
}

export interface AiChatFeedMessage extends AiChatFeedPayload {
  createdAt: number
  id: string
}

export interface AiStatusFeedPayload extends JsonObject {
  kind: AiStatusKind
  text?: string
  timestamp?: string
  type: "ai-status"
}

const AI_STATUS_KINDS = new Set<AiStatusKind>([
  "start",
  "processing",
  "complete",
  "error",
])

export const aiChatFeedPayloadSchema = z.object({
  content: z.string().trim().min(1),
  role: z.enum(["user", "assistant"]),
  sender: z.string().trim().min(1),
  timestamp: z.string().trim().min(1),
  type: z.literal("ai-chat"),
})

export function readAiChatFeedPayload(
  value: unknown
): AiChatFeedPayload | null {
  const result = aiChatFeedPayloadSchema.safeParse(value)

  if (!result.success) {
    return null
  }

  return result.data
}

export function getAiChatFeedMessages(
  messages: readonly { createdAt: number; data: unknown; id: string }[]
): AiChatFeedMessage[] {
  return messages
    .map((message) => {
      const payload = readAiChatFeedPayload(message.data)

      if (!payload) {
        return null
      }

      return {
        ...payload,
        createdAt: message.createdAt,
        id: message.id,
      }
    })
    .filter((message): message is AiChatFeedMessage => message !== null)
    .sort((first, second) => first.createdAt - second.createdAt)
}

export function mergeAiChatMessages(
  saved: AiChatFeedMessage[],
  pending: AiChatFeedMessage[]
): AiChatFeedMessage[] {
  const byId = new Map(saved.map((message) => [message.id, message]))
  for (const message of pending) {
    if (!byId.has(message.id)) byId.set(message.id, message)
  }
  return [...byId.values()].sort((first, second) => first.createdAt - second.createdAt)
}

export function readAiStatusFeedPayload(
  value: unknown
): AiStatusFeedPayload | null {
  if (!isRecord(value) || value.type !== "ai-status") {
    return null
  }

  const kind = value.kind

  if (typeof kind !== "string" || !isAiStatusKind(kind)) {
    return null
  }

  const text = value.text
  const timestamp = value.timestamp

  if (text !== undefined && typeof text !== "string") {
    return null
  }

  if (timestamp !== undefined && typeof timestamp !== "string") {
    return null
  }

  return {
    kind,
    text,
    timestamp,
    type: "ai-status",
  }
}

export function getLatestAiStatusFeedPayload(
  messages: readonly { createdAt: number; data: unknown }[]
) {
  let latestPayload: AiStatusFeedPayload | null = null
  let latestCreatedAt = Number.NEGATIVE_INFINITY

  for (const message of messages) {
    if (message.createdAt <= latestCreatedAt) {
      continue
    }

    const payload = readAiStatusFeedPayload(message.data)

    if (!payload) {
      continue
    }

    latestPayload = payload
    latestCreatedAt = message.createdAt
  }

  return latestPayload
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isAiStatusKind(value: string): value is AiStatusKind {
  return AI_STATUS_KINDS.has(value as AiStatusKind)
}

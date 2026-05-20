import "server-only"

import type { Liveblocks } from "@liveblocks/node"

interface EnsureLiveblocksFeedOptions {
  feedId: string
  metadata: Record<string, string>
  roomId: string
}

export async function ensureLiveblocksFeed(
  liveblocks: Liveblocks,
  { feedId, metadata, roomId }: EnsureLiveblocksFeedOptions
) {
  try {
    await liveblocks.createFeed({
      feedId,
      metadata,
      roomId,
    })
  } catch (error) {
    if (isExpectedFeedAlreadyExistsError(error)) {
      return
    }

    console.error("Failed creating Liveblocks feed", {
      error,
      feedId,
      roomId,
    })
    throw error
  }
}

function isExpectedFeedAlreadyExistsError(error: unknown) {
  if (!isRecord(error)) {
    return false
  }

  const status =
    readNumber(error.status) ??
    readNumber(error.statusCode) ??
    readNumber(error.code)
  const message = readErrorMessage(error).toLowerCase()

  return (
    status === 409 ||
    message.includes("already exists") ||
    message.includes("already_exist") ||
    message.includes("conflict")
  )
}

function readErrorMessage(error: Record<string, unknown>) {
  const message = error.message

  return typeof message === "string" ? message : ""
}

function readNumber(value: unknown) {
  return typeof value === "number" ? value : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

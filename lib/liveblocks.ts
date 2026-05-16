import "server-only"

import { Liveblocks } from "@liveblocks/node"

const CURSOR_COLORS = [
  "#00c8d4",
  "#6457f9",
  "#52a8ff",
  "#bf7af0",
  "#ff990a",
  "#ff6166",
  "#f75f8f",
  "#62c073",
] as const

const globalForLiveblocks = globalThis as typeof globalThis & {
  liveblocksClient?: Liveblocks
}

export function getLiveblocksClient() {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY

  if (!secret) {
    throw new Error("LIVEBLOCKS_SECRET_KEY is required")
  }

  if (!globalForLiveblocks.liveblocksClient) {
    globalForLiveblocks.liveblocksClient = new Liveblocks({ secret })
  }

  return globalForLiveblocks.liveblocksClient
}

export function getLiveblocksUserColor(userId: string) {
  let hash = 0

  for (let index = 0; index < userId.length; index += 1) {
    hash = (hash * 31 + userId.charCodeAt(index)) >>> 0
  }

  return CURSOR_COLORS[hash % CURSOR_COLORS.length]
}

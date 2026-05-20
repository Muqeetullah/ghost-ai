import type { LiveblocksFlow } from "@liveblocks/react-flow"

import type { AiStatusEvent } from "@/types/ai"
import type { AiChatFeedPayload, AiStatusFeedPayload } from "@/types/tasks"
import type { CanvasEdge, CanvasNode } from "@/types/canvas"

declare global {
  interface Liveblocks {
    Presence: {
      cursor: { x: number; y: number } | null
      thinking: boolean
    };

    Storage: {
      flow?: LiveblocksFlow<CanvasNode, CanvasEdge>
    }

    UserMeta: {
      id: string
      info: {
        name: string
        avatar: string
        color: string
      }
    };

    RoomEvent: AiStatusEvent

    ThreadMetadata: Record<string, never>

    FeedMetadata: {
      name?: string
    }

    FeedMessageData: AiChatFeedPayload | AiStatusFeedPayload

    RoomInfo: Record<string, never>
  }
}

export {};

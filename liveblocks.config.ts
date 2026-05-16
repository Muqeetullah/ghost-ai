import type { LiveblocksFlow } from "@liveblocks/react-flow"

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

    RoomEvent: never

    ThreadMetadata: Record<string, never>

    RoomInfo: Record<string, never>
  }
}

export {};

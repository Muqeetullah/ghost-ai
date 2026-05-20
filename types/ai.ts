import type { AiStatusKind } from "@/types/tasks"

export const AI_DESIGN_AGENT_USER_ID = "ghost-ai-design-agent"

export const AI_DESIGN_AGENT_INFO = {
  avatar: "",
  color: "#6457f9",
  name: "Ghost AI",
} as const

export interface AiStatusEvent extends Record<string, string> {
  id: string
  kind: AiStatusKind
  message: string
  timestamp: string
  type: "ai-status"
}

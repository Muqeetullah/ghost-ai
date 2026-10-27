"use client"

import { useAiFeedMessages } from "@/hooks/use-ai-feed-messages"
import { Panel } from "@xyflow/react"
import { AlertCircle, Bot, CheckCircle2, LoaderCircle } from "lucide-react"

import { AI_STATUS_FEED_ID, getLatestAiStatusFeedPayload, type AiStatusKind } from "@/types/tasks"

export function CanvasAiStatusFeed() {
  const { messages, error } = useAiFeedMessages(AI_STATUS_FEED_ID)
  const latestStatus = getLatestAiStatusFeedPayload(messages ?? [])

  // Status is supplementary. A feed timeout must not unmount the shared canvas.
  if (error) {
    return (
      <Panel position="top-center" className="pointer-events-none !m-4">
        <p role="status" className="rounded-xl border border-surface-border bg-sidebar px-4 py-2 text-xs text-copy-muted">
          AI activity is unavailable. You can still edit the canvas.
        </p>
      </Panel>
    )
  }

  if (!latestStatus?.text) {
    return null
  }

  return (
    <Panel position="top-center" className="pointer-events-none !m-4">
      <div
        aria-live="polite"
        className="w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-surface-border bg-sidebar p-2 shadow-2xl backdrop-blur-xl"
      >
        <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-semibold text-ai-text">
          <Bot className="h-4 w-4" />
          Ghost AI
        </div>
        <div className="flex items-start gap-2 rounded-xl bg-bg-elevated px-2 py-2 text-xs leading-5 text-copy-secondary">
          <AiStatusIcon kind={latestStatus.kind} />
          <span className="min-w-0 flex-1">{latestStatus.text}</span>
        </div>
      </div>
    </Panel>
  )
}

function AiStatusIcon({ kind }: { kind: AiStatusKind }) {
  if (kind === "complete") {
    return <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-state-success" />
  }

  if (kind === "error") {
    return <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-state-error" />
  }

  return <LoaderCircle className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-ai-text" />
}

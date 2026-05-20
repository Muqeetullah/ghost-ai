"use client"

import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { shallow } from "@liveblocks/client"
import {
  useCreateFeed,
  useCreateFeedMessage,
  useFeedMessages,
  useOthers,
  useSelf,
} from "@liveblocks/react"
import { useRealtimeRun } from "@trigger.dev/react-hooks"
import { Bot, Download, FileText, LoaderCircle, Send, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { designAgent } from "@/trigger/design-agent"
import {
  AI_CHAT_FEED_ID,
  AI_STATUS_FEED_ID,
  type AiChatFeedPayload,
  getAiChatFeedMessages,
  getLatestAiStatusFeedPayload,
} from "@/types/tasks"

const STARTER_PROMPTS = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
]

interface AiSidebarProps {
  isOpen: boolean
  onClose: () => void
  roomId: string
}

interface ActiveRunState {
  publicToken: string
  runId: string
}

export function AiSidebar({
  isOpen,
  onClose,
  roomId,
}: AiSidebarProps) {
  const [prompt, setPrompt] = useState("")
  const [sendError, setSendError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [activeRun, setActiveRun] = useState<ActiveRunState | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const chatEndRef = useRef<HTMLDivElement | null>(null)
  const isComposingRef = useRef(false)
  const completedRunIdsRef = useRef<Set<string>>(new Set())
  const errorRunIdsRef = useRef<Set<string>>(new Set())
  const createFeed = useCreateFeed()
  const createFeedMessage = useCreateFeedMessage()
  const chatFeed = useFeedMessages(AI_CHAT_FEED_ID)
  const statusFeed = useFeedMessages(AI_STATUS_FEED_ID)
  const senderName = useSelf((me) => me.info.name)
  const isRemoteAiThinking = useOthers(
    (others) => others.some((other) => other.presence.thinking === true),
    shallow
  )
  const chatMessages = useMemo(() => {
    return getAiChatFeedMessages(chatFeed.messages ?? [])
  }, [chatFeed])
  const latestStatus = useMemo(() => {
    return getLatestAiStatusFeedPayload(statusFeed.messages ?? [])
  }, [statusFeed])
  const isSharedGenerationActive =
    latestStatus?.kind === "start" || latestStatus?.kind === "processing"
  const { run: realtimeRun, error: realtimeRunError } =
    useRealtimeRun<typeof designAgent>(activeRun?.runId, {
      accessToken: activeRun?.publicToken,
      enabled: Boolean(activeRun?.runId && activeRun?.publicToken),
    })
  const isTrackedRunActive =
    activeRun !== null &&
    !realtimeRun?.finishedAt &&
    !isTerminalRunStatus(realtimeRun?.status)
  const isGenerationActive =
    isSending ||
    isTrackedRunActive ||
    isRemoteAiThinking ||
    isSharedGenerationActive
  const isAiWorking = isGenerationActive

  useEffect(() => {
    void createFeed(AI_STATUS_FEED_ID, {
      metadata: {
        name: "AI status feed",
      },
    }).catch(() => {
      // The feed is room-scoped and may already exist.
    })
    void createFeed(AI_CHAT_FEED_ID, {
      metadata: {
        name: "AI chat feed",
      },
    }).catch(() => {
      // The feed is room-scoped and may already exist.
    })
  }, [createFeed])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: "end" })
  }, [chatMessages.length])

  const pushAiChatMessage = useCallback(
    async (message: AiChatFeedPayload) => {
      try {
        await createFeedMessage(AI_CHAT_FEED_ID, message)
      } catch (error) {
        const messageText =
          error instanceof Error
            ? error.message
            : "Unable to update the shared AI chat."

        setSendError(messageText)
      }
    },
    [createFeedMessage]
  )

  useEffect(() => {
    if (!activeRun || !realtimeRunError) {
      return
    }

    if (errorRunIdsRef.current.has(activeRun.runId)) {
      return
    }

    errorRunIdsRef.current.add(activeRun.runId)
    setActiveRun(null)
    void pushAiChatMessage({
      content: `Ghost AI could not track the run: ${realtimeRunError.message}`,
      role: "assistant",
      sender: "Ghost AI",
      timestamp: new Date().toISOString(),
      type: "ai-chat",
    })
  }, [activeRun, pushAiChatMessage, realtimeRunError])

  useEffect(() => {
    if (!activeRun || !realtimeRun?.finishedAt) {
      return
    }

    if (completedRunIdsRef.current.has(activeRun.runId)) {
      return
    }

    completedRunIdsRef.current.add(activeRun.runId)
    setActiveRun(null)

    const content = realtimeRun.isSuccess
      ? getCompletedRunMessage(realtimeRun.output)
      : getFailedRunMessage(realtimeRun.error?.message)

    void pushAiChatMessage({
      content,
      role: "assistant",
      sender: "Ghost AI",
      timestamp: new Date().toISOString(),
      type: "ai-chat",
    })
  }, [activeRun, pushAiChatMessage, realtimeRun])

  function updatePrompt(value: string) {
    setPrompt(value)
    resizeTextarea()
  }

  function resizeTextarea() {
    requestAnimationFrame(() => {
      const textarea = textareaRef.current

      if (!textarea) {
        return
      }

      textarea.style.height = "auto"
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`
    })
  }

  async function sendChatMessage() {
    const trimmedPrompt = prompt.trim()

    if (trimmedPrompt.length === 0 || isGenerationActive) {
      return
    }

    setIsSending(true)
    setSendError(null)

    try {
      const message: AiChatFeedPayload = {
        content: trimmedPrompt,
        role: "user",
        sender: senderName ?? "Ghost AI User",
        timestamp: new Date().toISOString(),
        type: "ai-chat",
      }

      await createFeedMessage(AI_CHAT_FEED_ID, message)
      setPrompt("")
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = "72px"
        }
      })

      const designRun = await startDesignRun({
        prompt: trimmedPrompt,
        roomId,
      })

      setActiveRun(designRun)
    } catch (error) {
      const messageText =
        error instanceof Error
          ? error.message
          : "Unable to send the message or start Ghost AI."

      setSendError(messageText)
      await pushAiChatMessage({
        content: `Ghost AI could not start: ${messageText}`,
        role: "assistant",
        sender: "Ghost AI",
        timestamp: new Date().toISOString(),
        type: "ai-chat",
      })
    } finally {
      setIsSending(false)
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || isComposingRef.current) {
      return
    }

    event.preventDefault()
    void sendChatMessage()
  }

  return (
    <>
      {isOpen ? (
        <button
          type="button"
          aria-label="Close AI sidebar"
          onClick={onClose}
          className="fixed inset-x-0 top-14 bottom-0 z-30 bg-[var(--overlay-backdrop)] md:hidden"
        />
      ) : null}

      <aside
        aria-hidden={!isOpen}
        inert={!isOpen}
        className={cn(
          "fixed top-[4.5rem] right-4 bottom-4 z-40 flex w-[min(22rem,calc(100vw-2rem))] flex-col rounded-2xl border border-surface-border bg-bg-base/95 p-4 shadow-2xl backdrop-blur-xl transition-transform duration-200 ease-out",
          isOpen ? "translate-x-0" : "translate-x-[calc(100%+2rem)]"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Bot className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-copy-primary">
                AI Workspace
              </h2>
              <p className="mt-1 truncate text-xs text-copy-muted">
                Collaborate with Ghost AI
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Close AI sidebar"
            onClick={onClose}
            className="text-copy-muted hover:bg-bg-subtle hover:text-copy-primary"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div
          aria-live="polite"
          className={cn(
            "mt-4 flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-xs",
            isAiWorking
              ? "border-ai/40 bg-ai/10 text-ai-text"
              : "border-surface-border bg-bg-elevated text-copy-muted"
          )}
        >
          {isAiWorking ? (
            <LoaderCircle className="h-3.5 w-3.5 shrink-0 animate-spin" />
          ) : (
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-full bg-state-success"
            />
          )}
          <span className="min-w-0 truncate">
            {latestStatus?.text ?? (isAiWorking ? "Ghost AI is working" : "Ghost AI is ready")}
          </span>
        </div>

        <Tabs defaultValue="architect" className="mt-4 min-h-0 flex-1">
          <TabsList className="grid h-9 w-full grid-cols-2 rounded-xl border border-surface-border bg-bg-subtle p-1">
            <TabsTrigger
              value="architect"
              className="rounded-lg text-xs text-copy-muted data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-none"
            >
              AI Architect
            </TabsTrigger>
            <TabsTrigger
              value="specs"
              className="rounded-lg text-xs text-copy-muted data-[state=active]:bg-accent data-[state=active]:text-accent-foreground data-[state=active]:shadow-none"
            >
              Specs
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="architect"
            className="mt-4 flex min-h-0 flex-col gap-3"
          >
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {chatMessages.length === 0 ? (
                <div className="flex min-h-full flex-col items-center justify-center px-2 py-8 text-center">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                    <Bot className="h-6 w-6" />
                  </div>
                  <p className="mt-4 text-sm font-medium text-copy-primary">
                    Start the room chat.
                  </p>
                  <p className="mt-2 max-w-64 text-sm leading-6 text-copy-muted">
                    Share prompts, decisions, and architecture notes with
                    everyone in this workspace.
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {STARTER_PROMPTS.map((starterPrompt) => (
                      <button
                        key={starterPrompt}
                        type="button"
                        disabled={isGenerationActive}
                        onClick={() => updatePrompt(starterPrompt)}
                        className="rounded-full bg-bg-subtle px-3 py-1.5 text-xs font-medium text-ai-text transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {starterPrompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pb-1">
                  {chatMessages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        message.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-6",
                          message.role === "user"
                            ? "bg-state-success text-bg-base"
                            : "border border-surface-border bg-bg-elevated text-copy-primary"
                        )}
                      >
                        <div className="mb-1 flex items-center gap-2 text-[0.6875rem] leading-4 text-copy-muted">
                          <span className="min-w-0 truncate font-medium">
                            {message.sender}
                          </span>
                          <span aria-hidden="true" className="shrink-0">
                            /
                          </span>
                          <time
                            className="shrink-0"
                            dateTime={message.timestamp}
                          >
                            {formatChatTimestamp(message.timestamp)}
                          </time>
                        </div>
                        <p className="whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            <div className="border-t border-surface-border pt-3">
              {isGenerationActive ? (
                <div
                  aria-live="polite"
                  className="mb-3 flex min-h-9 items-center gap-2 rounded-xl border border-state-success/40 bg-bg-elevated px-3 py-2 text-xs text-copy-secondary"
                >
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-state-success"
                  />
                  <span className="min-w-0 truncate">
                    {latestStatus?.text ??
                      (isSending
                        ? "Starting Ghost AI..."
                        : "Ghost AI is updating the canvas.")}
                  </span>
                </div>
              ) : null}
              <div className="flex items-end gap-2">
                <Textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(event) => updatePrompt(event.target.value)}
                  onCompositionStart={() => {
                    isComposingRef.current = true
                  }}
                  onCompositionEnd={() => {
                    isComposingRef.current = false
                  }}
                  onKeyDown={handleComposerKeyDown}
                  placeholder="Ask Ghost AI to update the canvas..."
                  disabled={isGenerationActive}
                  className="max-h-40 min-h-[72px] resize-none border-surface-border bg-bg-elevated text-copy-primary placeholder:text-copy-faint"
                />
                <Button
                  type="button"
                  size="icon-lg"
                  aria-label="Send message"
                  onClick={() => void sendChatMessage()}
                  disabled={prompt.trim().length === 0 || isGenerationActive}
                  className="mb-0.5 bg-state-success text-bg-base hover:bg-state-success/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isGenerationActive ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {sendError ? (
                <p role="alert" className="mt-2 text-xs text-state-error">
                  {sendError}
                </p>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="specs" className="mt-4 min-h-0 space-y-4">
            <Button
              type="button"
              disabled
              aria-disabled="true"
              aria-label="Generate Spec (coming soon)"
              title="Coming soon"
              className="w-full bg-ai text-copy-primary hover:bg-ai/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FileText className="h-4 w-4" />
              Generate Spec
            </Button>

            <div className="rounded-2xl border border-surface-border bg-bg-elevated p-4">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-copy-primary">
                    Architecture Spec Draft
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-copy-muted">
                    Demo technical specification generated from the current
                    canvas graph, including components, data flow, and
                    deployment notes.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled
                className="mt-4 w-full justify-center text-copy-muted"
              >
                <Download className="h-4 w-4" />
                Download unavailable
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </aside>
    </>
  )
}

async function startDesignRun({
  prompt,
  roomId,
}: {
  prompt: string
  roomId: string
}): Promise<ActiveRunState> {
  const response = await fetch("/api/ai/design", {
    body: JSON.stringify({
      projectId: roomId,
      prompt,
      roomId,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  })

  const data: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(readApiError(data) ?? "Unable to start Ghost AI.")
  }

  if (!isRecord(data) || typeof data.runId !== "string") {
    throw new Error("Ghost AI did not return a run ID.")
  }

  const runId = data.runId.trim()
  const responsePublicToken =
    typeof data.publicToken === "string" ? data.publicToken.trim() : ""
  const publicToken = responsePublicToken || (await fetchDesignRunToken(runId))

  return {
    publicToken,
    runId,
  }
}

async function fetchDesignRunToken(runId: string) {
  const response = await fetch("/api/ai/design/token", {
    body: JSON.stringify({ runId }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  })
  const data: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(readApiError(data) ?? "Unable to create a run token.")
  }

  if (!isRecord(data) || typeof data.token !== "string" || !data.token.trim()) {
    throw new Error("Ghost AI did not return a run token.")
  }

  return data.token.trim()
}

function getCompletedRunMessage(output: unknown) {
  if (isRecord(output) && typeof output.summary === "string") {
    return `Canvas updated: ${output.summary}`
  }

  return "Canvas updated. I added the design changes to the shared workspace."
}

function getFailedRunMessage(errorMessage?: string) {
  if (errorMessage) {
    return `Ghost AI could not update the canvas: ${errorMessage}`
  }

  return "Ghost AI could not update the canvas. Try a smaller or clearer prompt."
}

function isTerminalRunStatus(status: string | undefined) {
  return (
    status === "COMPLETED" ||
    status === "CANCELED" ||
    status === "FAILED" ||
    status === "CRASHED" ||
    status === "SYSTEM_FAILURE" ||
    status === "EXPIRED" ||
    status === "TIMED_OUT"
  )
}

function readApiError(value: unknown) {
  if (!isRecord(value)) {
    return null
  }

  if (typeof value.error === "string") {
    return value.error
  }

  if (typeof value.message === "string") {
    return value.message
  }

  return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function formatChatTimestamp(timestamp: string) {
  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) {
    return "now"
  }

  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })
}

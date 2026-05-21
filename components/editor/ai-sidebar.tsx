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
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { CanvasSnapshot } from "@/types/canvas"
import type { generateSpec } from "@/trigger/generate-spec"
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
  canvasSnapshot: CanvasSnapshot
  isOpen: boolean
  onClose: () => void
  roomId: string
}

interface ActiveRunState {
  publicToken: string
  runId: string
}

interface ProjectSpecSummary {
  createdAt: string
  filename: string
  id: string
}

interface ProjectSpecsResponse {
  specs: ProjectSpecSummary[]
}

interface ProjectSpecPreviewResponse extends ProjectSpecSummary {
  content: string
}

export function AiSidebar({
  canvasSnapshot,
  isOpen,
  onClose,
  roomId,
}: AiSidebarProps) {
  const [activeTab, setActiveTab] = useState("architect")
  const [prompt, setPrompt] = useState("")
  const [sendError, setSendError] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [activeRun, setActiveRun] = useState<ActiveRunState | null>(null)
  const [specs, setSpecs] = useState<ProjectSpecSummary[]>([])
  const [isSpecsLoading, setIsSpecsLoading] = useState(false)
  const [specsError, setSpecsError] = useState<string | null>(null)
  const [selectedSpec, setSelectedSpec] = useState<ProjectSpecSummary | null>(
    null
  )
  const [selectedSpecContent, setSelectedSpecContent] = useState<string | null>(
    null
  )
  const [isSelectedSpecLoading, setIsSelectedSpecLoading] = useState(false)
  const [selectedSpecError, setSelectedSpecError] = useState<string | null>(
    null
  )
  const [activeSpecRun, setActiveSpecRun] = useState<ActiveRunState | null>(
    null
  )
  const [isSpecStarting, setIsSpecStarting] = useState(false)
  const [specActionError, setSpecActionError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const chatEndRef = useRef<HTMLDivElement | null>(null)
  const isComposingRef = useRef(false)
  const completedRunIdsRef = useRef<Set<string>>(new Set())
  const errorRunIdsRef = useRef<Set<string>>(new Set())
  const completedSpecRunIdsRef = useRef<Set<string>>(new Set())
  const errorSpecRunIdsRef = useRef<Set<string>>(new Set())
  const hasLoadedSpecsRef = useRef(false)
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
  const { run: realtimeSpecRun, error: realtimeSpecRunError } =
    useRealtimeRun<typeof generateSpec>(activeSpecRun?.runId, {
      accessToken: activeSpecRun?.publicToken,
      enabled: Boolean(activeSpecRun?.runId && activeSpecRun?.publicToken),
    })
  const isTrackedRunActive =
    activeRun !== null &&
    !realtimeRun?.finishedAt &&
    !isTerminalRunStatus(realtimeRun?.status)
  const isTrackedSpecRunActive =
    activeSpecRun !== null &&
    !realtimeSpecRun?.finishedAt &&
    !isTerminalRunStatus(realtimeSpecRun?.status)
  const isSpecGenerationActive = isSpecStarting || isTrackedSpecRunActive
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

  const loadSpecs = useCallback(
    async (force = false) => {
      if (!force && hasLoadedSpecsRef.current) {
        return specs
      }

      setIsSpecsLoading(true)
      setSpecsError(null)

      try {
        const response = await fetch(`/api/projects/${roomId}/specs`)
        const payload = await readJsonResponse<ProjectSpecsResponse>(response)

        hasLoadedSpecsRef.current = true
        setSpecs(payload.specs)
        return payload.specs
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Could not load specs for this project."

        setSpecsError(message)
        throw error instanceof Error ? error : new Error(message)
      } finally {
        setIsSpecsLoading(false)
      }
    },
    [roomId, specs]
  )

  useEffect(() => {
    hasLoadedSpecsRef.current = false
  }, [roomId])

  useEffect(() => {
    if (!isOpen || activeTab !== "specs" || hasLoadedSpecsRef.current) {
      return
    }

    void loadSpecs().catch(() => undefined)
  }, [activeTab, isOpen, loadSpecs])

  useEffect(() => {
    if (!selectedSpec) {
      return
    }

    const specId = selectedSpec.id
    let isMounted = true

    async function loadSelectedSpec() {
      setIsSelectedSpecLoading(true)
      setSelectedSpecContent(null)
      setSelectedSpecError(null)

      try {
        const response = await fetch(
          `/api/projects/${roomId}/specs/${specId}`
        )
        const payload = await readJsonResponse<ProjectSpecPreviewResponse>(
          response
        )

        if (!isMounted) {
          return
        }

        setSelectedSpecContent(payload.content)
      } catch (error) {
        if (!isMounted) {
          return
        }

        setSelectedSpecError(
          error instanceof Error
            ? error.message
            : "Could not load the selected spec."
        )
      } finally {
        if (isMounted) {
          setIsSelectedSpecLoading(false)
        }
      }
    }

    void loadSelectedSpec()

    return () => {
      isMounted = false
    }
  }, [roomId, selectedSpec])

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
    if (!activeSpecRun || !realtimeSpecRunError) {
      return
    }

    if (errorSpecRunIdsRef.current.has(activeSpecRun.runId)) {
      return
    }

    errorSpecRunIdsRef.current.add(activeSpecRun.runId)
    setActiveSpecRun(null)
    setSpecActionError(realtimeSpecRunError.message)
  }, [activeSpecRun, realtimeSpecRunError])

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

  useEffect(() => {
    if (!activeSpecRun || !realtimeSpecRun?.finishedAt) {
      return
    }

    if (completedSpecRunIdsRef.current.has(activeSpecRun.runId)) {
      return
    }

    completedSpecRunIdsRef.current.add(activeSpecRun.runId)
    setActiveSpecRun(null)

    if (realtimeSpecRun.isSuccess) {
      const generatedSpecId = readSpecRunMetadataValue(
        realtimeSpecRun.metadata,
        "specId"
      )

      void (async () => {
        try {
          const nextSpec = await waitForGeneratedSpec({
            loadSpecs,
            preferredSpecId: generatedSpecId,
          })

          if (nextSpec) {
            setSelectedSpec(nextSpec)
            await pushAiChatMessage({
              content:
                "Technical spec generated and saved. The latest result is ready to preview in the Specs tab.",
              role: "assistant",
              sender: "Ghost AI",
              timestamp: new Date().toISOString(),
              type: "ai-chat",
            })
          } else {
            setSpecActionError(
              "Ghost AI saved the spec, but the latest result could not be loaded."
            )
          }
        } catch (error) {
          setSpecActionError(
            error instanceof Error
              ? error.message
              : "Could not refresh the generated spec."
          )
        }
      })()

      return
    }

    const errorMessage =
      realtimeSpecRun.error?.message ??
      "Ghost AI could not generate the technical spec."
    const errorTimeout = window.setTimeout(() => {
      setSpecActionError(errorMessage)
      void pushAiChatMessage({
        content: `Ghost AI could not generate the spec: ${errorMessage}`,
        role: "assistant",
        sender: "Ghost AI",
        timestamp: new Date().toISOString(),
        type: "ai-chat",
      })
    }, 0)

    return () => {
      window.clearTimeout(errorTimeout)
    }
  }, [activeSpecRun, loadSpecs, pushAiChatMessage, realtimeSpecRun])

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

  async function generateSpecDocument() {
    if (
      isSpecGenerationActive ||
      canvasSnapshot.nodes.length === 0 ||
      canvasSnapshot.edges.length === 0
    ) {
      return
    }

    setIsSpecStarting(true)
    setSpecActionError(null)

    try {
      const specRun = await startSpecRun({
        chatHistory: chatMessages,
        edges: canvasSnapshot.edges,
        nodes: canvasSnapshot.nodes,
        roomId,
      })

      setActiveSpecRun(specRun)
      setActiveTab("specs")
      hasLoadedSpecsRef.current = false
      void pushAiChatMessage({
        content:
          "Generating a technical spec from the current canvas and room context.",
        role: "assistant",
        sender: "Ghost AI",
        timestamp: new Date().toISOString(),
        type: "ai-chat",
      })
    } catch (error) {
      const messageText =
        error instanceof Error
          ? error.message
          : "Unable to start spec generation."
      setSpecActionError(messageText)
    } finally {
      setIsSpecStarting(false)
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

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="mt-4 min-h-0 flex-1"
        >
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

          <TabsContent
            value="specs"
            className="mt-4 flex min-h-0 flex-1 flex-col gap-4"
          >
            <Button
              type="button"
              disabled={
                isSpecGenerationActive ||
                canvasSnapshot.nodes.length === 0 ||
                canvasSnapshot.edges.length === 0
              }
              aria-label="Generate technical spec"
              onClick={() => void generateSpecDocument()}
              className="w-full bg-ai text-copy-primary hover:bg-ai/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSpecGenerationActive ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              {isSpecGenerationActive ? "Generating Spec..." : "Generate Spec"}
            </Button>

            {specActionError ? (
              <div className="rounded-2xl border border-state-error/40 bg-state-error/10 px-3 py-3 text-sm text-state-error">
                {specActionError}
              </div>
            ) : null}

            {!isSpecGenerationActive &&
            (canvasSnapshot.nodes.length === 0 || canvasSnapshot.edges.length === 0) ? (
              <div className="rounded-2xl border border-surface-border bg-bg-base px-3 py-3 text-sm text-copy-muted">
                Add at least one connected flow to the canvas before generating a spec.
              </div>
            ) : null}

            <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-surface-border bg-bg-elevated">
              <div className="border-b border-surface-border px-4 py-3">
                <h3 className="text-sm font-semibold text-copy-primary">
                  Project Specs
                </h3>
                <p className="mt-1 text-xs text-copy-muted">
                  Preview and download generated Markdown specs.
                </p>
              </div>

              <ScrollArea className="min-h-0 flex-1 overflow-x-hidden">
                <div className="max-w-full space-y-2 overflow-x-hidden p-3">
                  {isSpecsLoading ? (
                    <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-center">
                      <LoaderCircle className="h-5 w-5 animate-spin text-copy-muted" />
                      <p className="text-sm text-copy-muted">
                        Loading project specs...
                      </p>
                    </div>
                  ) : specsError ? (
                    <div className="rounded-2xl border border-state-error/40 bg-state-error/10 px-3 py-4 text-sm text-state-error">
                      {specsError}
                    </div>
                  ) : specs.length === 0 ? (
                    <div className="flex min-h-40 flex-col items-center justify-center px-4 py-8 text-center">
                      <div className="flex size-11 items-center justify-center rounded-2xl bg-bg-subtle text-copy-muted">
                        <FileText className="h-5 w-5" />
                      </div>
                      <p className="mt-4 text-sm font-medium text-copy-primary">
                        No specs yet
                      </p>
                      <p className="mt-2 max-w-60 text-sm leading-6 text-copy-muted">
                        Generated architecture specs will appear here for quick
                        preview and download.
                      </p>
                    </div>
                  ) : (
                    specs.map((spec) => (
                      <div
                        key={spec.id}
                        className="flex min-w-0 w-full max-w-full items-start gap-2 overflow-hidden rounded-xl border border-surface-border bg-bg-base p-2 transition-colors hover:border-subtle-border hover:bg-bg-subtle"
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedSpec(spec)}
                          className="block w-0 min-w-0 max-w-full flex-1 overflow-hidden rounded-lg px-3 py-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/60"
                        >
                          <p
                            className="block truncate text-sm font-medium text-copy-primary"
                            title={spec.filename}
                          >
                            {spec.filename}
                          </p>
                          <p className="mt-1 text-xs text-copy-muted">
                            {formatSpecTimestamp(spec.createdAt)}
                          </p>
                        </button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Download ${spec.filename}`}
                          onClick={(event) => {
                            event.stopPropagation()
                            downloadProjectSpec(roomId, spec.id)
                          }}
                          className="mt-1 shrink-0 text-copy-muted hover:bg-bg-subtle hover:text-copy-primary"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </aside>

      <Dialog
        open={selectedSpec !== null}
        onOpenChange={(nextOpen) => {
          if (nextOpen) {
            return
          }

          setSelectedSpec(null)
          setSelectedSpecContent(null)
          setSelectedSpecError(null)
        }}
      >
        <DialogContent className="h-[min(85vh,52rem)] w-[min(92vw,64rem)] max-w-[min(92vw,64rem)] gap-0 overflow-hidden rounded-3xl border border-surface-border bg-bg-elevated p-0 text-copy-primary shadow-2xl ring-0 sm:max-w-[min(92vw,64rem)]">
          <DialogHeader className="border-b border-surface-border px-6 py-5 pr-14">
            <DialogTitle className="break-all pr-2 text-lg leading-tight font-semibold text-copy-primary">
              {selectedSpec?.filename ?? "Spec preview"}
            </DialogTitle>
            <DialogDescription className="text-sm text-copy-muted">
              {selectedSpec
                ? `Generated ${formatSpecTimestamp(selectedSpec.createdAt)}`
                : "Preview the generated Markdown spec."}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="min-h-0 flex-1">
            <div className="px-6 py-5">
              {isSelectedSpecLoading ? (
                <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
                  <LoaderCircle className="h-5 w-5 animate-spin text-copy-muted" />
                  <p className="text-sm text-copy-muted">
                    Loading spec preview...
                  </p>
                </div>
              ) : selectedSpecError ? (
                <div className="rounded-2xl border border-state-error/40 bg-state-error/10 px-4 py-4 text-sm text-state-error">
                  {selectedSpecError}
                </div>
              ) : selectedSpecContent ? (
                <div className="mx-auto w-full max-w-3xl space-y-4">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ ...props }) => (
                        <a
                          {...props}
                          className="text-brand underline underline-offset-4"
                          target="_blank"
                          rel="noreferrer"
                        />
                      ),
                      blockquote: ({ ...props }) => (
                        <blockquote
                          {...props}
                          className="border-l-2 border-surface-border pl-4 text-copy-secondary"
                        />
                      ),
                      code: ({ className, ...props }) => {
                        const isBlock = Boolean(className)

                        if (isBlock) {
                          return (
                            <code
                              {...props}
                              className={cn(
                                "block overflow-x-auto rounded-xl bg-bg-base px-4 py-3 font-mono text-xs text-copy-secondary",
                                className
                              )}
                            />
                          )
                        }

                        return (
                          <code
                            {...props}
                            className="rounded-md bg-bg-base px-1.5 py-0.5 font-mono text-xs text-copy-primary"
                          />
                        )
                      },
                      h1: ({ ...props }) => (
                        <h1
                          {...props}
                          className="text-2xl font-semibold text-copy-primary"
                        />
                      ),
                      h2: ({ ...props }) => (
                        <h2
                          {...props}
                          className="text-xl font-semibold text-copy-primary"
                        />
                      ),
                      h3: ({ ...props }) => (
                        <h3
                          {...props}
                          className="text-lg font-semibold text-copy-primary"
                        />
                      ),
                      li: ({ ...props }) => (
                        <li
                          {...props}
                          className="ml-5 list-disc text-sm leading-7 text-copy-secondary"
                        />
                      ),
                      ol: ({ ...props }) => (
                        <ol {...props} className="space-y-1" />
                      ),
                      p: ({ ...props }) => (
                        <p
                          {...props}
                          className="text-sm leading-7 text-copy-secondary"
                        />
                      ),
                      pre: ({ ...props }) => (
                        <pre {...props} className="my-4 overflow-x-auto" />
                      ),
                      table: ({ ...props }) => (
                        <div className="overflow-x-auto">
                          <table
                            {...props}
                            className="min-w-full border-collapse text-sm"
                          />
                        </div>
                      ),
                      td: ({ ...props }) => (
                        <td
                          {...props}
                          className="border border-surface-border px-3 py-2 text-copy-secondary"
                        />
                      ),
                      th: ({ ...props }) => (
                        <th
                          {...props}
                          className="border border-surface-border bg-bg-base px-3 py-2 text-left font-medium text-copy-primary"
                        />
                      ),
                      ul: ({ ...props }) => (
                        <ul {...props} className="space-y-1" />
                      ),
                    }}
                  >
                    {selectedSpecContent}
                  </ReactMarkdown>
                </div>
              ) : null}
            </div>
          </ScrollArea>

          <DialogFooter className="border-surface-border bg-bg-base/80" showCloseButton>
            <Button
              type="button"
              onClick={() => {
                if (selectedSpec) {
                  downloadProjectSpec(roomId, selectedSpec.id)
                }
              }}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

async function startSpecRun({
  chatHistory,
  edges,
  nodes,
  roomId,
}: {
  chatHistory: ProjectSpecPreviewResponse["content"] extends string
    ? AiChatFeedPayload[]
    : never
  edges: CanvasSnapshot["edges"]
  nodes: CanvasSnapshot["nodes"]
  roomId: string
}): Promise<ActiveRunState> {
  const response = await fetch("/api/ai/spec", {
    body: JSON.stringify({
      chatHistory,
      edges,
      nodes,
      roomId,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  })

  const data: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(readApiError(data) ?? "Unable to start spec generation.")
  }

  if (!isRecord(data) || typeof data.runId !== "string") {
    throw new Error("Ghost AI did not return a spec run ID.")
  }

  return {
    publicToken: await fetchSpecRunToken(data.runId.trim()),
    runId: data.runId.trim(),
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

async function fetchSpecRunToken(runId: string) {
  const response = await fetch("/api/ai/spec/token", {
    body: JSON.stringify({ runId }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  })
  const data: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(readApiError(data) ?? "Unable to create a spec run token.")
  }

  if (!isRecord(data) || typeof data.token !== "string" || !data.token.trim()) {
    throw new Error("Ghost AI did not return a spec run token.")
  }

  return data.token.trim()
}

function downloadProjectSpec(projectId: string, specId: string) {
  if (typeof window === "undefined") {
    return
  }

  const anchor = document.createElement("a")
  anchor.href = `/api/projects/${projectId}/specs/${specId}/download`
  anchor.rel = "noreferrer"
  anchor.style.display = "none"
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
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

async function waitForGeneratedSpec({
  loadSpecs,
  preferredSpecId,
}: {
  loadSpecs: (force?: boolean) => Promise<ProjectSpecSummary[]>
  preferredSpecId?: string
}) {
  const maxAttempts = preferredSpecId ? 4 : 1

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const nextSpecs = await loadSpecs(true)
    const matchedSpec = preferredSpecId
      ? nextSpecs.find((spec) => spec.id === preferredSpecId)
      : nextSpecs[0]

    if (matchedSpec) {
      return matchedSpec
    }

    if (attempt < maxAttempts - 1) {
      await waitForSpecRefresh(300 * (attempt + 1))
    }
  }

  return null
}

function readSpecRunMetadataValue(
  metadataValue: unknown,
  key: string
) {
  if (!isRecord(metadataValue)) {
    return undefined
  }

  const value = metadataValue[key]
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const data: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(readApiError(data) ?? "Request failed.")
  }

  return data as T
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function waitForSpecRefresh(delayInMs: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, delayInMs)
  })
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

function formatSpecTimestamp(timestamp: string) {
  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) {
    return "Unknown date"
  }

  return date.toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

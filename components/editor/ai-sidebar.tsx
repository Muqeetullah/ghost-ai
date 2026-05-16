"use client"

import { type KeyboardEvent, useRef, useState } from "react"
import { Bot, Download, FileText, Send, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const STARTER_PROMPTS = [
  "Design an e-commerce backend",
  "Create a chat app architecture",
  "Build a CI/CD pipeline",
]

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
}

interface AiSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function AiSidebar({ isOpen, onClose }: AiSidebarProps) {
  const [prompt, setPrompt] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

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

  function submitPrompt() {
    const trimmedPrompt = prompt.trim()

    if (trimmedPrompt.length === 0) {
      return
    }

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmedPrompt,
      },
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "I can use the canvas context here soon. For now, this sidebar is ready for the AI architecture workflow.",
      },
    ])
    setPrompt("")
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "72px"
      }
    })
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return
    }

    event.preventDefault()
    submitPrompt()
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

        <Tabs defaultValue="architect" className="mt-4 min-h-0 flex-1">
          <TabsList className="grid h-9 w-full grid-cols-2 rounded-xl border border-surface-border bg-bg-subtle p-1">
            <TabsTrigger
              value="architect"
              className="rounded-lg text-xs text-copy-muted data-active:bg-accent data-active:text-accent-foreground data-active:shadow-none"
            >
              AI Architect
            </TabsTrigger>
            <TabsTrigger
              value="specs"
              className="rounded-lg text-xs text-copy-muted data-active:bg-accent data-active:text-accent-foreground data-active:shadow-none"
            >
              Specs
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="architect"
            className="mt-4 flex min-h-0 flex-col gap-3"
          >
            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {messages.length === 0 ? (
                <div className="flex min-h-full flex-col items-center justify-center px-2 py-8 text-center">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                    <Bot className="h-6 w-6" />
                  </div>
                  <p className="mt-4 text-sm font-medium text-copy-primary">
                    Start with a system goal.
                  </p>
                  <p className="mt-2 max-w-64 text-sm leading-6 text-copy-muted">
                    Ask Ghost AI to draft an architecture, expand a subsystem, or
                    reason through tradeoffs.
                  </p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {STARTER_PROMPTS.map((starterPrompt) => (
                      <button
                        key={starterPrompt}
                        type="button"
                        onClick={() => updatePrompt(starterPrompt)}
                        className="rounded-full bg-bg-subtle px-3 py-1.5 text-xs font-medium text-ai-text transition-colors hover:bg-accent hover:text-accent-foreground"
                      >
                        {starterPrompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pb-1">
                  {messages.map((message) => (
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
                            ? "border-2 border-brand/50 bg-accent-dim text-copy-primary"
                            : "border border-surface-border bg-bg-elevated text-ai-text"
                        )}
                      >
                        {message.content}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-surface-border pt-3">
              <div className="flex items-end gap-2">
                <Textarea
                  ref={textareaRef}
                  value={prompt}
                  onChange={(event) => updatePrompt(event.target.value)}
                  onKeyDown={handleComposerKeyDown}
                  placeholder="Ask Ghost AI to design, refine, or explain..."
                  className="max-h-40 min-h-[72px] resize-none border-surface-border bg-bg-elevated text-copy-primary placeholder:text-copy-faint"
                />
                <Button
                  type="button"
                  size="icon-lg"
                  aria-label="Send message"
                  onClick={submitPrompt}
                  disabled={prompt.trim().length === 0}
                  className="mb-0.5 bg-ai text-copy-primary hover:bg-ai/90"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="specs" className="mt-4 min-h-0 space-y-4">
            <Button
              type="button"
              className="w-full bg-ai text-copy-primary hover:bg-ai/90"
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

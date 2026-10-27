"use client"

import { useEffect, useState } from "react"
import { useFeedMessages, useRoom } from "@liveblocks/react"
import { z } from "zod"

const responseSchema = z.object({ messages: z.array(z.object({
  id: z.string(),
  createdAt: z.number(),
  data: z.unknown(),
})) })

export interface AiFeedMessage {
  id: string
  createdAt: number
  data: unknown
}

// The HTTP path reads the same Liveblocks feed when the browser subscription fails.
export function useAiFeedMessages(feedId: string) {
  const roomId = useRoom().id
  const live = useFeedMessages(feedId)
  const key = `${roomId}/${feedId}`
  const [fallback, setFallback] = useState<{
    key: string
    messages?: AiFeedMessage[]
    error?: Error
  } | null>(null)

  useEffect(() => {
    if (!live.error && !live.isLoading) return

    let stopped = false
    let timer: ReturnType<typeof setTimeout> | undefined
    const controller = new AbortController()

    async function refresh() {
      try {
        const response = await fetch(`/api/projects/${encodeURIComponent(roomId)}/ai-feed?feed=${encodeURIComponent(feedId)}`, {
          cache: "no-store",
          signal: controller.signal,
        })
        if (!response.ok) throw new Error("Could not load AI messages")
        const payload = responseSchema.parse(await response.json())
        if (!stopped) setFallback({ key, messages: payload.messages })
      } catch (error) {
        if (!stopped) setFallback((previous) => ({
          key,
          messages: previous?.key === key ? previous.messages : undefined,
          error: error instanceof Error ? error : new Error("Could not load AI messages"),
        }))
      } finally {
        if (!stopped) timer = setTimeout(refresh, 3000)
      }
    }

    void refresh()
    return () => {
      stopped = true
      controller.abort()
      clearTimeout(timer)
    }
  }, [feedId, key, live.error, live.isLoading, roomId])

  const saved = fallback?.key === key ? fallback : null
  const useLive = !live.error && !live.isLoading
  return {
    messages: useLive ? live.messages : saved?.messages,
    error: useLive ? undefined : saved?.error,
    isLoading: useLive ? false : !saved?.messages && !saved?.error,
  }
}

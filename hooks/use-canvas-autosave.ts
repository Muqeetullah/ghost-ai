"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import type { CanvasSnapshot } from "@/types/canvas"

export type CanvasSaveStatus = "saving" | "saved" | "error"

interface UseCanvasAutosaveOptions {
  debounceMs?: number
  edges: CanvasSnapshot["edges"]
  enabled: boolean
  nodes: CanvasSnapshot["nodes"]
  projectId: string
}

interface UseCanvasAutosaveResult {
  saveNow: () => void
  status: CanvasSaveStatus
}

const DEFAULT_SAVE_DEBOUNCE_MS = 900

export function useCanvasAutosave({
  debounceMs = DEFAULT_SAVE_DEBOUNCE_MS,
  edges,
  enabled,
  nodes,
  projectId,
}: UseCanvasAutosaveOptions): UseCanvasAutosaveResult {
  const [status, setStatus] = useState<CanvasSaveStatus>("saved")
  const latestSnapshotRef = useRef<CanvasSnapshot>({ nodes, edges })
  const lastSavedSnapshotRef = useRef<string | null>(null)
  const saveRequestIdRef = useRef(0)

  const snapshot = useMemo<CanvasSnapshot>(
    () => ({
      edges,
      nodes,
    }),
    [edges, nodes]
  )

  const serializedSnapshot = useMemo(() => JSON.stringify(snapshot), [snapshot])

  useEffect(() => {
    latestSnapshotRef.current = snapshot
  }, [snapshot])

  const saveSnapshot = useCallback(
    async (serialized: string) => {
      const requestId = saveRequestIdRef.current + 1
      saveRequestIdRef.current = requestId
      setStatus("saving")

      try {
        const response = await fetch(`/api/projects/${projectId}/canvas`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: serialized,
        })

        if (!response.ok) {
          throw new Error("Canvas save failed")
        }

        lastSavedSnapshotRef.current = serialized
        const latestSerialized = JSON.stringify(latestSnapshotRef.current)

        if (saveRequestIdRef.current === requestId) {
          setStatus(latestSerialized === serialized ? "saved" : "saving")
        }
      } catch {
        if (saveRequestIdRef.current === requestId) {
          setStatus("error")
        }
      }
    },
    [projectId]
  )

  const saveNow = useCallback(() => {
    if (!enabled) {
      return
    }

    const latestSnapshot = latestSnapshotRef.current
    const serialized = JSON.stringify(latestSnapshot)

    void saveSnapshot(serialized)
  }, [enabled, saveSnapshot])

  useEffect(() => {
    if (!enabled) {
      return
    }

    if (lastSavedSnapshotRef.current === serializedSnapshot) {
      setStatus("saved")
      return
    }

    setStatus("saving")

    const timeoutId = window.setTimeout(() => {
      void saveSnapshot(serializedSnapshot)
    }, debounceMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [debounceMs, enabled, saveSnapshot, serializedSnapshot, snapshot])

  return {
    saveNow,
    status,
  }
}

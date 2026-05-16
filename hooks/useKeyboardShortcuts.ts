"use client"

import { useEffect } from "react"
import type { ReactFlowInstance } from "@xyflow/react"

import type { CanvasEdge, CanvasNode } from "@/types/canvas"

interface KeyboardShortcutHandlers {
  undo: () => void
  redo: () => void
}

const VIEWPORT_ANIMATION_DURATION = 160

export function useKeyboardShortcuts(
  flowInstance: ReactFlowInstance<CanvasNode, CanvasEdge> | null,
  { undo, redo }: KeyboardShortcutHandlers
) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) {
        return
      }

      const key = event.key.toLowerCase()
      const usesHistoryModifier = event.metaKey || event.ctrlKey

      if (usesHistoryModifier && key === "z") {
        event.preventDefault()

        if (event.shiftKey) {
          redo()
          return
        }

        undo()
        return
      }

      if (usesHistoryModifier && key === "y") {
        event.preventDefault()
        redo()
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey || !flowInstance) {
        return
      }

      if (event.key === "+" || event.key === "=") {
        event.preventDefault()
        void flowInstance.zoomIn({ duration: VIEWPORT_ANIMATION_DURATION })
        return
      }

      if (event.key === "-") {
        event.preventDefault()
        void flowInstance.zoomOut({ duration: VIEWPORT_ANIMATION_DURATION })
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [flowInstance, redo, undo])
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  if (target.isContentEditable) {
    return true
  }

  const tagName = target.tagName.toLowerCase()

  return tagName === "input" || tagName === "textarea"
}

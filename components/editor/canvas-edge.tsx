import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react"
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  useReactFlow,
  type EdgeProps,
} from "@xyflow/react"

import type { CanvasEdge, CanvasNode } from "@/types/canvas"

const EDGE_INTERACTION_WIDTH = 24
const EDGE_BORDER_RADIUS = 12
const EDGE_OFFSET = 28
const MIN_LABEL_INPUT_WIDTH = 72
const MAX_LABEL_INPUT_WIDTH = 192

export function CanvasEdgeRenderer({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  markerStart,
  selected,
  label,
  data,
  style,
}: EdgeProps<CanvasEdge>) {
  const { updateEdge } = useReactFlow<CanvasNode, CanvasEdge>()
  const [isEditing, setIsEditing] = useState(false)
  const [draftLabel, setDraftLabel] = useState("")
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: EDGE_BORDER_RADIUS,
    offset: EDGE_OFFSET,
  })
  const displayLabel = getEdgeLabel(label, data)
  const isLabelVisible = isEditing || selected || displayLabel
  const labelInputWidth = Math.min(
    Math.max(draftLabel.length * 8 + 28, MIN_LABEL_INPUT_WIDTH),
    MAX_LABEL_INPUT_WIDTH
  )

  useEffect(() => {
    if (!isEditing) {
      return
    }

    inputRef.current?.focus()
    inputRef.current?.select()
  }, [isEditing])

  const startEditing = () => {
    setDraftLabel(displayLabel)
    setIsEditing(true)
  }

  const saveLabel = () => {
    const nextLabel = draftLabel.trim()

    updateEdge(id, {
      label: nextLabel || undefined,
    })
    setDraftLabel(nextLabel)
    setIsEditing(false)
  }

  const handleLabelChange = (event: ChangeEvent<HTMLInputElement>) => {
    setDraftLabel(event.target.value)
  }

  const handleLabelKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation()

    if (event.key === "Enter" || event.key === "Escape") {
      event.preventDefault()
      saveLabel()
    }
  }

  return (
    <>
      <BaseEdge
        id={id}
        interactionWidth={EDGE_INTERACTION_WIDTH}
        markerEnd={markerEnd}
        markerStart={markerStart}
        path={edgePath}
        style={{
          ...style,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          opacity: selected ? 1 : 0.76,
        }}
        onDoubleClick={(event) => {
          event.stopPropagation()
          startEditing()
        }}
      />
      {isLabelVisible ? (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-auto absolute"
            style={{
              left: labelX,
              top: labelY,
              transform: "translate(-50%, calc(-100% - 8px))",
            }}
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => {
              event.stopPropagation()
              startEditing()
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {isEditing ? (
              <input
                ref={inputRef}
                aria-label="Edit edge label"
                className="rounded-full border border-brand bg-bg-elevated px-2.5 py-1 text-center text-xs font-medium text-copy-primary shadow-lg outline-none"
                style={{ width: labelInputWidth }}
                value={draftLabel}
                onBlur={saveLabel}
                onChange={handleLabelChange}
                onKeyDown={handleLabelKeyDown}
                onPointerDown={(event) => event.stopPropagation()}
              />
            ) : (
              <span
                data-placeholder={!displayLabel}
                className="block max-w-48 truncate rounded-full border border-surface-border bg-bg-elevated px-2.5 py-1 text-xs font-medium text-copy-primary shadow-lg data-[placeholder=true]:text-copy-muted"
              >
                {displayLabel || "Label"}
              </span>
            )}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  )
}

function getEdgeLabel(
  label: EdgeProps<CanvasEdge>["label"],
  data: EdgeProps<CanvasEdge>["data"]
) {
  if (typeof label === "string" && label.trim()) {
    return label.trim()
  }

  if (typeof data?.label === "string" && data.label.trim()) {
    return data.label.trim()
  }

  return ""
}

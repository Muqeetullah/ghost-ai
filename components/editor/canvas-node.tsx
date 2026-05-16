import type {
  ChangeEvent,
  CSSProperties,
  KeyboardEvent,
  ReactNode,
  RefObject,
} from "react"
import { useEffect, useRef, useState } from "react"
import {
  Handle,
  NodeResizer,
  Position,
  useReactFlow,
  type NodeProps,
} from "@xyflow/react"

import { cn } from "@/lib/utils"
import {
  NODE_COLORS,
  type CanvasEdge,
  type CanvasNode,
  type CanvasNodeColor,
  type CanvasNodeShape,
} from "@/types/canvas"

const MIN_NODE_WIDTH = 88
const MIN_NODE_HEIGHT = 56

const HANDLE_POSITIONS = [
  { id: "top", position: Position.Top },
  { id: "right", position: Position.Right },
  { id: "bottom", position: Position.Bottom },
  { id: "left", position: Position.Left },
] as const

const NODE_COLOR_LABELS = [
  "Neutral",
  "Blue",
  "Purple",
  "Orange",
  "Red",
  "Pink",
  "Green",
  "Teal",
] as const satisfies readonly string[]

interface NodeShapeSurfaceProps {
  shape: CanvasNodeShape
  fill: string
  stroke: string
  text: string
  selected?: boolean
  children?: ReactNode
  className?: string
}

export function CanvasNodeRenderer({
  id,
  data,
  isConnectable,
  selected,
}: NodeProps<CanvasNode>) {
  const { updateNodeData } = useReactFlow<CanvasNode, CanvasEdge>()
  const [isEditing, setIsEditing] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const stroke = selected ? data.color.text : "var(--border-subtle)"

  useEffect(() => {
    if (!isEditing) {
      return
    }

    textareaRef.current?.focus()
    textareaRef.current?.select()
  }, [isEditing])

  const handleLabelChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    updateNodeData(id, { label: event.target.value })
  }

  const handleColorSelect = (color: CanvasNodeColor) => {
    updateNodeData(id, { color })
  }

  const handleLabelKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Escape") {
      return
    }

    event.preventDefault()
    setIsEditing(false)
  }

  return (
    <div className="group relative h-full w-full">
      {selected ? (
        <NodeColorToolbar
          activeColor={data.color}
          onSelectColor={handleColorSelect}
        />
      ) : null}

      <NodeResizer
        isVisible={selected}
        minWidth={MIN_NODE_WIDTH}
        minHeight={MIN_NODE_HEIGHT}
        handleClassName="!h-2.5 !w-2.5 !rounded-full !border !border-bg-base !bg-brand !opacity-80"
        lineClassName="!border-brand !opacity-40"
      />

      <NodeShapeSurface
        shape={data.shape}
        fill={data.color.fill}
        stroke={stroke}
        text={data.color.text}
        selected={selected}
      >
        <NodeLabel
          label={data.label}
          isEditing={isEditing}
          onStartEditing={() => setIsEditing(true)}
          onStopEditing={() => setIsEditing(false)}
          onChange={handleLabelChange}
          onKeyDown={handleLabelKeyDown}
          textareaRef={textareaRef}
        />
      </NodeShapeSurface>

      {HANDLE_POSITIONS.map(({ id, position }) => (
        <Handle
          key={id}
          id={id}
          type="source"
          position={position}
          isConnectable={isConnectable}
          isConnectableStart={isConnectable}
          isConnectableEnd={isConnectable}
          className="!h-2 !w-2 !border !border-bg-base !bg-copy-primary !opacity-0 !transition-opacity group-hover:!opacity-100"
        />
      ))}
    </div>
  )
}

interface NodeColorToolbarProps {
  activeColor: CanvasNodeColor
  onSelectColor: (color: CanvasNodeColor) => void
}

function NodeColorToolbar({
  activeColor,
  onSelectColor,
}: NodeColorToolbarProps) {
  return (
    <div
      className="nodrag nopan pointer-events-auto absolute left-1/2 top-0 z-30 -mt-2 flex -translate-x-1/2 -translate-y-full items-center gap-1 rounded-full border border-surface-border bg-sidebar p-1 shadow-2xl backdrop-blur-xl"
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      {NODE_COLORS.map((color, index) => {
        const isActive =
          activeColor.fill === color.fill && activeColor.text === color.text

        return (
          <button
            key={color.fill}
            type="button"
            aria-label={`Apply ${NODE_COLOR_LABELS[index]} node color`}
            aria-pressed={isActive}
            title={NODE_COLOR_LABELS[index]}
            data-active={isActive}
            className="node-color-swatch h-6 w-6 rounded-full border p-0.5 transition-[border-color,box-shadow,transform] hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand data-[active=true]:scale-110"
            style={{
              "--node-swatch-glow": color.text,
              backgroundColor: color.fill,
              borderColor: isActive ? color.text : "var(--border-subtle)",
              color: color.text,
            } as NodeColorSwatchStyle}
            onClick={(event) => {
              event.stopPropagation()
              onSelectColor(color)
            }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <span
              aria-hidden="true"
              className="block h-full w-full rounded-full opacity-90"
              style={{ backgroundColor: color.text }}
            />
          </button>
        )
      })}
    </div>
  )
}

interface NodeColorSwatchStyle extends CSSProperties {
  "--node-swatch-glow": string
}

interface NodeLabelProps {
  label: string
  isEditing: boolean
  onStartEditing: () => void
  onStopEditing: () => void
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void
  textareaRef: RefObject<HTMLTextAreaElement | null>
}

function NodeLabel({
  label,
  isEditing,
  onStartEditing,
  onStopEditing,
  onChange,
  onKeyDown,
  textareaRef,
}: NodeLabelProps) {
  const handleTextareaKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    event.stopPropagation()
    onKeyDown(event)
  }

  return (
    <span
      className={cn(
        "relative flex h-full min-h-6 w-full items-center justify-center",
        isEditing && "nodrag nopan"
      )}
      onDoubleClick={(event) => {
        event.stopPropagation()
        onStartEditing()
      }}
      onPointerDown={(event) => {
        if (isEditing) {
          event.stopPropagation()
        }
      }}
    >
      <span
        className={cn(
          "max-w-full truncate text-center",
          isEditing && "opacity-0",
          !label && "text-copy-muted"
        )}
      >
        {label || "Label"}
      </span>

      {isEditing ? (
        <textarea
          ref={textareaRef}
          aria-label="Edit node label"
          className="nodrag nopan absolute inset-0 m-auto h-full w-full resize-none overflow-hidden whitespace-pre-wrap break-words border-0 bg-transparent p-0 text-center text-sm font-medium leading-5 text-inherit caret-brand outline-none [overflow-wrap:anywhere]"
          placeholder="Label"
          rows={2}
          value={label}
          onBlur={onStopEditing}
          onChange={onChange}
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
          onKeyDown={handleTextareaKeyDown}
          onPointerDown={(event) => event.stopPropagation()}
        />
      ) : null}
    </span>
  )
}

export function NodeShapeSurface({
  shape,
  fill,
  stroke,
  text,
  selected = false,
  children,
  className,
}: NodeShapeSurfaceProps) {
  const colorStyle = {
    color: text,
  }

  if (shape === "diamond" || shape === "hexagon" || shape === "cylinder") {
    return (
      <div
        className={cn(
          "relative flex h-full w-full items-center justify-center px-4 py-3 text-center text-sm font-medium transition-[filter,box-shadow]",
          className
        )}
        style={{
          ...colorStyle,
          filter: selected
            ? "drop-shadow(0 0 10px var(--accent-primary-dim))"
            : undefined,
        }}
      >
        <NodeSvgShape shape={shape} fill={fill} stroke={stroke} />
        <span className="relative z-10 flex h-full w-[72%] min-w-0 items-center justify-center">
          {children}
        </span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden border px-4 py-3 text-center text-sm font-medium shadow-lg transition-[border-color,box-shadow]",
        getCssShapeClassName(shape),
        className
      )}
      style={{
        ...colorStyle,
        backgroundColor: fill,
        borderColor: stroke,
        boxShadow: selected ? "0 0 0 2px var(--accent-primary-dim)" : undefined,
      }}
    >
      <span className="relative z-10 flex h-full w-full min-w-0 items-center justify-center">
        {children}
      </span>
    </div>
  )
}

interface NodeSvgShapeProps {
  shape: Extract<CanvasNodeShape, "diamond" | "hexagon" | "cylinder">
  fill: string
  stroke: string
}

function NodeSvgShape({ shape, fill, stroke }: NodeSvgShapeProps) {
  if (shape === "cylinder") {
    return (
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible drop-shadow-lg"
        preserveAspectRatio="none"
        viewBox="0 0 100 100"
      >
        <path
          d="M8 20C8 8 92 8 92 20V80C92 92 8 92 8 80Z"
          fill={fill}
          stroke={stroke}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M8 20C8 32 92 32 92 20C92 8 8 8 8 20Z"
          fill={fill}
          stroke={stroke}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d="M8 80C8 92 92 92 92 80"
          fill="none"
          stroke={stroke}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    )
  }

  const points =
    shape === "diamond"
      ? "50,2 98,50 50,98 2,50"
      : "25,3 75,3 98,50 75,97 25,97 2,50"

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible drop-shadow-lg"
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    >
      <polygon
        fill={fill}
        points={points}
        stroke={stroke}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

function getCssShapeClassName(shape: CanvasNodeShape) {
  if (shape === "circle" || shape === "pill") {
    return "rounded-full"
  }

  return "rounded-xl"
}

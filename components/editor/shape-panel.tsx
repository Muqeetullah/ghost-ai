import type { DragEvent, KeyboardEvent } from "react"
import {
  Circle,
  Cylinder,
  Diamond,
  Hexagon,
  Pill,
  RectangleHorizontal,
  type LucideIcon,
} from "lucide-react"
import { Panel } from "@xyflow/react"

import { Button } from "@/components/ui/button"
import type { CanvasNodeShape } from "@/types/canvas"

export const SHAPE_DRAG_MIME_TYPE = "application/x-ghost-ai-shape"

interface ShapeSize {
  width: number
  height: number
}

export interface ShapeDragPayload {
  grabOffset: ShapeDragPosition
  shape: CanvasNodeShape
  size: ShapeSize
}

interface ShapeDragPosition {
  x: number
  y: number
}

interface CanvasShapePanelProps {
  onShapeDragStart?: (
    payload: ShapeDragPayload,
    position: ShapeDragPosition
  ) => void
  onShapeDragEnd?: () => void
  onShapeInsert?: (payload: ShapeDragPayload) => void
}

const DEFAULT_SHAPE_SIZES = {
  rectangle: { width: 176, height: 88 },
  diamond: { width: 144, height: 144 },
  circle: { width: 112, height: 112 },
  pill: { width: 168, height: 72 },
  cylinder: { width: 152, height: 96 },
  hexagon: { width: 156, height: 96 },
} satisfies Record<CanvasNodeShape, ShapeSize>

const SHAPE_CONTROLS = [
  { shape: "rectangle", label: "Rectangle", Icon: RectangleHorizontal },
  { shape: "diamond", label: "Diamond", Icon: Diamond },
  { shape: "circle", label: "Circle", Icon: Circle },
  { shape: "pill", label: "Pill", Icon: Pill },
  { shape: "cylinder", label: "Cylinder", Icon: Cylinder },
  { shape: "hexagon", label: "Hexagon", Icon: Hexagon },
] satisfies Array<{
  shape: CanvasNodeShape
  label: string
  Icon: LucideIcon
}>

export function CanvasShapePanel({
  onShapeDragStart,
  onShapeDragEnd,
  onShapeInsert,
}: CanvasShapePanelProps) {
  return (
    <Panel position="bottom-center" className="pointer-events-auto !m-4">
      <div className="flex items-center gap-1 rounded-full border border-surface-border bg-sidebar p-1.5 shadow-2xl backdrop-blur-xl">
        {SHAPE_CONTROLS.map(({ shape, label, Icon }) => (
          <Button
            key={shape}
            type="button"
            variant="ghost"
            size="icon-lg"
            draggable
            aria-label={`Drag ${label} shape`}
            title={label}
            onDragStart={(event) =>
              handleShapeDragStart(event, shape, onShapeDragStart)
            }
            onDragEnd={onShapeDragEnd}
            onClick={() => handleShapeInsert(shape, onShapeInsert)}
            onKeyDown={(event) =>
              handleShapeInsertKeyDown(event, shape, onShapeInsert)
            }
            className="cursor-grab rounded-full text-copy-muted hover:bg-bg-subtle hover:text-copy-primary active:cursor-grabbing"
          >
            <Icon className="h-4 w-4" />
          </Button>
        ))}
      </div>
    </Panel>
  )
}

export function hasShapeDragPayload(dataTransfer: DataTransfer) {
  return Array.from(dataTransfer.types).includes(SHAPE_DRAG_MIME_TYPE)
}

export function readShapeDragPayload(
  dataTransfer: DataTransfer
): ShapeDragPayload | null {
  const serializedPayload = dataTransfer.getData(SHAPE_DRAG_MIME_TYPE)

  if (!serializedPayload) {
    return null
  }

  let parsedPayload: unknown

  try {
    parsedPayload = JSON.parse(serializedPayload)
  } catch {
    return null
  }

  if (!isShapeDragPayload(parsedPayload)) {
    return null
  }

  return parsedPayload
}

function handleShapeDragStart(
  event: DragEvent<HTMLButtonElement>,
  shape: CanvasNodeShape,
  onShapeDragStart?: CanvasShapePanelProps["onShapeDragStart"]
) {
  const bounds = event.currentTarget.getBoundingClientRect()
  const payload = createShapeDragPayload(shape, {
    x: event.clientX - bounds.left,
    y: event.clientY - bounds.top,
  })

  event.dataTransfer.effectAllowed = "copy"
  setTransparentDragImage(event.dataTransfer)
  event.dataTransfer.setData(SHAPE_DRAG_MIME_TYPE, JSON.stringify(payload))
  event.dataTransfer.setData("text/plain", shape)
  onShapeDragStart?.(payload, {
    x: event.clientX,
    y: event.clientY,
  })
}

function handleShapeInsert(
  shape: CanvasNodeShape,
  onShapeInsert?: CanvasShapePanelProps["onShapeInsert"]
) {
  onShapeInsert?.(createShapeDragPayload(shape))
}

function handleShapeInsertKeyDown(
  event: KeyboardEvent<HTMLButtonElement>,
  shape: CanvasNodeShape,
  onShapeInsert?: CanvasShapePanelProps["onShapeInsert"]
) {
  if (event.key !== "Enter" && event.key !== " ") {
    return
  }

  event.preventDefault()
  handleShapeInsert(shape, onShapeInsert)
}

function createShapeDragPayload(
  shape: CanvasNodeShape,
  grabOffset: ShapeDragPosition = { x: 0, y: 0 }
): ShapeDragPayload {
  return {
    grabOffset,
    shape,
    size: DEFAULT_SHAPE_SIZES[shape],
  }
}

function isShapeDragPayload(value: unknown): value is ShapeDragPayload {
  if (!isRecord(value)) {
    return false
  }

  if (!isCanvasNodeShape(value.shape) || !isRecord(value.size)) {
    return false
  }

  return isPositiveFiniteNumber(value.size.width) &&
    isPositiveFiniteNumber(value.size.height) &&
    isDragOffset(value.grabOffset)
}

function isDragOffset(value: unknown): value is ShapeDragPosition {
  return (
    isRecord(value) &&
    typeof value.x === "number" &&
    Number.isFinite(value.x) &&
    typeof value.y === "number" &&
    Number.isFinite(value.y)
  )
}

function isCanvasNodeShape(value: unknown): value is CanvasNodeShape {
  return (
    typeof value === "string" &&
    SHAPE_CONTROLS.some((control) => control.shape === value)
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
}

function setTransparentDragImage(dataTransfer: DataTransfer) {
  const dragImage = document.createElement("span")

  dragImage.style.position = "fixed"
  dragImage.style.top = "0"
  dragImage.style.left = "0"
  dragImage.style.width = "1px"
  dragImage.style.height = "1px"
  dragImage.style.opacity = "0"

  document.body.appendChild(dragImage)
  dataTransfer.setDragImage(dragImage, 0, 0)

  window.setTimeout(() => {
    dragImage.remove()
  }, 0)
}

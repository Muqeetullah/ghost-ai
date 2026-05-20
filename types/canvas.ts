import type { Edge, Node } from "@xyflow/react"

export const CANVAS_NODE_TYPE = "canvasNode" as const
export const CANVAS_EDGE_TYPE = "canvasEdge" as const

export const NODE_COLORS = [
  { fill: "#1F1F1F", text: "#EDEDED" },
  { fill: "#10233D", text: "#52A8FF" },
  { fill: "#2E1938", text: "#BF7AF0" },
  { fill: "#331B00", text: "#FF990A" },
  { fill: "#3C1618", text: "#FF6166" },
  { fill: "#3A1726", text: "#F75F8F" },
  { fill: "#0F2E18", text: "#62C073" },
  { fill: "#062822", text: "#0AC7B4" },
] as const

export const NODE_SHAPES = [
  "rectangle",
  "diamond",
  "circle",
  "pill",
  "cylinder",
  "hexagon",
] as const

export const DEFAULT_NODE_COLOR = NODE_COLORS[0]
export const DEFAULT_NODE_SHAPE = NODE_SHAPES[0]
export const DEFAULT_NODE_SIZES = {
  rectangle: { width: 176, height: 88 },
  diamond: { width: 144, height: 144 },
  circle: { width: 112, height: 112 },
  pill: { width: 168, height: 72 },
  cylinder: { width: 152, height: 96 },
  hexagon: { width: 156, height: 96 },
} as const satisfies Record<CanvasNodeShape, CanvasNodeSize>

export type CanvasNodeColor = (typeof NODE_COLORS)[number]
export type CanvasNodeShape = (typeof NODE_SHAPES)[number]

export interface CanvasNodeSize {
  width: number
  height: number
}

export interface CanvasNodeData extends Record<string, unknown> {
  label: string
  color: CanvasNodeColor
  shape: CanvasNodeShape
}

export type CanvasEdgeData = Record<string, unknown>

export type CanvasNode = Node<CanvasNodeData, typeof CANVAS_NODE_TYPE>
export type CanvasEdge = Edge<CanvasEdgeData, typeof CANVAS_EDGE_TYPE>

export interface CanvasSnapshot {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

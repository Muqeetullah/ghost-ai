import {
  BaseEdge,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react"

import type { CanvasEdge } from "@/types/canvas"

const EDGE_INTERACTION_WIDTH = 24
const EDGE_BORDER_RADIUS = 12
const EDGE_OFFSET = 28

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
  style,
}: EdgeProps<CanvasEdge>) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: EDGE_BORDER_RADIUS,
    offset: EDGE_OFFSET,
  })

  return (
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
    />
  )
}

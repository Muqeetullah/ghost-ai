"use client"

import { Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type {
  CanvasEdge,
  CanvasNode,
  CanvasNodeShape,
} from "@/types/canvas"
import {
  CANVAS_TEMPLATES,
  type CanvasTemplate,
} from "@/components/editor/starter-templates"

interface StarterTemplatesModalProps {
  isOpen: boolean
  onImport: (template: CanvasTemplate) => void
  onOpenChange: (isOpen: boolean) => void
}

interface PreviewBounds {
  minX: number
  minY: number
  width: number
  height: number
}

interface PreviewNode extends CanvasNode {
  previewX: number
  previewY: number
  previewWidth: number
  previewHeight: number
}

const PREVIEW_WIDTH = 320
const PREVIEW_HEIGHT = 164
const PREVIEW_PADDING = 22

export function StarterTemplatesModal({
  isOpen,
  onImport,
  onOpenChange,
}: StarterTemplatesModalProps) {
  function handleImport(template: CanvasTemplate) {
    onImport(template)
    onOpenChange(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(42rem,calc(100vh-2rem))] gap-0 overflow-hidden rounded-3xl border border-surface-border bg-bg-elevated p-0 text-copy-primary shadow-2xl ring-0 sm:max-w-4xl">
        <DialogHeader className="space-y-2 p-6 pr-12">
          <DialogTitle className="text-lg font-semibold text-copy-primary">
            Starter Templates
          </DialogTitle>
          <DialogDescription className="text-sm leading-6 text-copy-muted">
            Replace this canvas with a pre-built architecture diagram.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto border-t border-surface-border px-6 py-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {CANVAS_TEMPLATES.map((template) => (
              <article
                key={template.id}
                className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-surface-border bg-bg-subtle/55"
              >
                <TemplatePreview template={template} />

                <div className="flex flex-1 flex-col p-4">
                  <h3 className="text-sm font-semibold text-copy-primary">
                    {template.name}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-6 text-copy-muted">
                    {template.description}
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleImport(template)}
                    className="mt-4 w-full"
                  >
                    <Upload className="h-4 w-4" />
                    Import
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function TemplatePreview({ template }: { template: CanvasTemplate }) {
  const bounds = getPreviewBounds(template.nodes)
  const previewNodes = template.nodes.map((node) =>
    getPreviewNode(node, bounds)
  )

  return (
    <div className="border-b border-surface-border bg-base/80 p-3">
      <svg
        aria-hidden="true"
        className="h-[164px] w-full rounded-xl border border-surface-border bg-bg-surface"
        preserveAspectRatio="xMidYMid meet"
        viewBox={`0 0 ${PREVIEW_WIDTH} ${PREVIEW_HEIGHT}`}
      >
        <defs>
          <marker
            id={`${template.id}-preview-arrow`}
            markerHeight="6"
            markerWidth="6"
            orient="auto-start-reverse"
            refX="5"
            refY="3"
            viewBox="0 0 6 6"
          >
            <path d="M1 1L5 3L1 5Z" fill="var(--text-muted)" />
          </marker>
        </defs>

        {template.edges.map((edge) => (
          <PreviewEdge
            key={edge.id}
            edge={edge}
            markerId={`${template.id}-preview-arrow`}
            nodes={previewNodes}
          />
        ))}

        {previewNodes.map((node) => (
          <PreviewNodeShape key={node.id} node={node} />
        ))}
      </svg>
    </div>
  )
}

interface PreviewEdgeProps {
  edge: CanvasEdge
  markerId: string
  nodes: PreviewNode[]
}

function PreviewEdge({ edge, markerId, nodes }: PreviewEdgeProps) {
  const source = nodes.find((node) => node.id === edge.source)
  const target = nodes.find((node) => node.id === edge.target)

  if (!source || !target) {
    return null
  }

  const sourceCenter = getPreviewNodeCenter(source)
  const targetCenter = getPreviewNodeCenter(target)

  return (
    <line
      markerEnd={`url(#${markerId})`}
      stroke="var(--text-muted)"
      strokeLinecap="round"
      strokeOpacity="0.7"
      strokeWidth="1.25"
      x1={sourceCenter.x}
      x2={targetCenter.x}
      y1={sourceCenter.y}
      y2={targetCenter.y}
    />
  )
}

function PreviewNodeShape({ node }: { node: PreviewNode }) {
  const { data } = node
  const shapeProps = {
    fill: data.color.fill,
    stroke: data.color.text,
    strokeWidth: 1.5,
  }

  return (
    <g>
      <ShapeElement node={node} shape={data.shape} shapeProps={shapeProps} />
      <text
        dominantBaseline="middle"
        fill={data.color.text}
        fontSize="8"
        fontWeight="600"
        textAnchor="middle"
        x={node.previewX + node.previewWidth / 2}
        y={node.previewY + node.previewHeight / 2}
      >
        {getPreviewLabel(data.label)}
      </text>
    </g>
  )
}

interface ShapeElementProps {
  node: PreviewNode
  shape: CanvasNodeShape
  shapeProps: {
    fill: string
    stroke: string
    strokeWidth: number
  }
}

function ShapeElement({ node, shape, shapeProps }: ShapeElementProps) {
  if (shape === "circle") {
    return (
      <ellipse
        {...shapeProps}
        cx={node.previewX + node.previewWidth / 2}
        cy={node.previewY + node.previewHeight / 2}
        rx={node.previewWidth / 2}
        ry={node.previewHeight / 2}
      />
    )
  }

  if (shape === "pill") {
    return (
      <rect
        {...shapeProps}
        height={node.previewHeight}
        rx={node.previewHeight / 2}
        width={node.previewWidth}
        x={node.previewX}
        y={node.previewY}
      />
    )
  }

  if (shape === "diamond" || shape === "hexagon") {
    return (
      <polygon
        {...shapeProps}
        points={getPolygonPoints(node, shape)}
      />
    )
  }

  if (shape === "cylinder") {
    return (
      <g>
        <path
          {...shapeProps}
          d={getCylinderBodyPath(node)}
        />
        <ellipse
          {...shapeProps}
          cx={node.previewX + node.previewWidth / 2}
          cy={node.previewY + node.previewHeight * 0.22}
          rx={node.previewWidth / 2}
          ry={node.previewHeight * 0.16}
        />
        <path
          d={getCylinderBottomPath(node)}
          fill="none"
          stroke={shapeProps.stroke}
          strokeWidth={shapeProps.strokeWidth}
        />
      </g>
    )
  }

  return (
    <rect
      {...shapeProps}
      height={node.previewHeight}
      rx="7"
      width={node.previewWidth}
      x={node.previewX}
      y={node.previewY}
    />
  )
}

function getPreviewBounds(nodes: CanvasNode[]): PreviewBounds {
  const minX = Math.min(...nodes.map((node) => node.position.x))
  const minY = Math.min(...nodes.map((node) => node.position.y))
  const maxX = Math.max(
    ...nodes.map((node) => node.position.x + getNodeWidth(node))
  )
  const maxY = Math.max(
    ...nodes.map((node) => node.position.y + getNodeHeight(node))
  )

  return {
    minX,
    minY,
    width: Math.max(maxX - minX, 1),
    height: Math.max(maxY - minY, 1),
  }
}

function getPreviewNode(node: CanvasNode, bounds: PreviewBounds): PreviewNode {
  const scale = Math.min(
    (PREVIEW_WIDTH - PREVIEW_PADDING * 2) / bounds.width,
    (PREVIEW_HEIGHT - PREVIEW_PADDING * 2) / bounds.height
  )
  const contentWidth = bounds.width * scale
  const contentHeight = bounds.height * scale
  const offsetX = (PREVIEW_WIDTH - contentWidth) / 2
  const offsetY = (PREVIEW_HEIGHT - contentHeight) / 2

  return {
    ...node,
    previewX: offsetX + (node.position.x - bounds.minX) * scale,
    previewY: offsetY + (node.position.y - bounds.minY) * scale,
    previewWidth: getNodeWidth(node) * scale,
    previewHeight: getNodeHeight(node) * scale,
  }
}

function getPreviewNodeCenter(node: PreviewNode) {
  return {
    x: node.previewX + node.previewWidth / 2,
    y: node.previewY + node.previewHeight / 2,
  }
}

function getNodeWidth(node: CanvasNode) {
  return node.width ?? node.initialWidth ?? 120
}

function getNodeHeight(node: CanvasNode) {
  return node.height ?? node.initialHeight ?? 72
}

function getPreviewLabel(label: string) {
  return label.length > 16 ? `${label.slice(0, 14)}...` : label
}

function getPolygonPoints(
  node: PreviewNode,
  shape: Extract<CanvasNodeShape, "diamond" | "hexagon">
) {
  const x = node.previewX
  const y = node.previewY
  const width = node.previewWidth
  const height = node.previewHeight

  if (shape === "diamond") {
    return `${x + width / 2},${y} ${x + width},${y + height / 2} ${x + width / 2},${y + height} ${x},${y + height / 2}`
  }

  return `${x + width * 0.25},${y} ${x + width * 0.75},${y} ${x + width},${y + height / 2} ${x + width * 0.75},${y + height} ${x + width * 0.25},${y + height} ${x},${y + height / 2}`
}

function getCylinderBodyPath(node: PreviewNode) {
  const x = node.previewX
  const y = node.previewY
  const width = node.previewWidth
  const height = node.previewHeight
  const topY = y + height * 0.22

  return `M${x},${topY}C${x},${y} ${x + width},${y} ${x + width},${topY}V${y + height * 0.82}C${x + width},${y + height} ${x},${y + height} ${x},${y + height * 0.82}Z`
}

function getCylinderBottomPath(node: PreviewNode) {
  const x = node.previewX
  const y = node.previewY
  const width = node.previewWidth
  const height = node.previewHeight

  return `M${x},${y + height * 0.82}C${x},${y + height} ${x + width},${y + height} ${x + width},${y + height * 0.82}`
}

import {
  CANVAS_EDGE_TYPE,
  CANVAS_NODE_TYPE,
  NODE_COLORS,
  type CanvasEdge,
  type CanvasNode,
  type CanvasNodeShape,
} from "@/types/canvas"

export interface CanvasTemplate {
  id: string
  name: string
  description: string
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

export interface CanvasTemplateImport {
  id: number
  template: CanvasTemplate
}

interface TemplateNodeInput {
  id: string
  label: string
  shape: CanvasNodeShape
  colorIndex: number
  position: CanvasNode["position"]
  size: {
    width: number
    height: number
  }
}

interface TemplateEdgeInput {
  id: string
  source: string
  target: string
  sourceHandle: TemplateHandleId
  targetHandle: TemplateHandleId
}

type TemplateHandleId = "top" | "right" | "bottom" | "left"

export const CANVAS_TEMPLATES: CanvasTemplate[] = [
  {
    id: "microservices",
    name: "Microservices",
    description:
      "API gateway, service boundaries, independent data stores, and async messaging.",
    nodes: createTemplateNodes([
      node("client", "Client Apps", "hexagon", 1, 0, 120, 164, 92),
      node("gateway", "API Gateway", "pill", 7, 240, 128, 168, 72),
      node("auth", "Auth Service", "rectangle", 2, 500, 0, 168, 84),
      node("orders", "Orders Service", "rectangle", 3, 500, 128, 176, 88),
      node("billing", "Billing Service", "rectangle", 5, 500, 264, 176, 88),
      node("orders-db", "Orders DB", "cylinder", 6, 760, 128, 152, 96),
      node("event-bus", "Event Bus", "diamond", 4, 760, 280, 132, 132),
    ]),
    edges: createTemplateEdges([
      edge("client-gateway", "client", "gateway", "right", "left"),
      edge("gateway-auth", "gateway", "auth", "right", "left"),
      edge("gateway-orders", "gateway", "orders", "right", "left"),
      edge("gateway-billing", "gateway", "billing", "right", "left"),
      edge("orders-db", "orders", "orders-db", "right", "left"),
      edge("orders-events", "orders", "event-bus", "bottom", "left"),
      edge("billing-events", "billing", "event-bus", "right", "left"),
    ]),
  },
  {
    id: "ci-cd-pipeline",
    name: "CI/CD Pipeline",
    description:
      "Source control through build, test, artifact storage, deployment, and production.",
    nodes: createTemplateNodes([
      node("repo", "Git Repo", "hexagon", 2, 0, 118, 152, 92),
      node("ci", "CI Runner", "pill", 1, 220, 128, 168, 72),
      node("tests", "Test Suite", "diamond", 4, 462, 98, 132, 132),
      node("artifacts", "Artifact Store", "cylinder", 7, 690, 116, 152, 96),
      node("deploy", "Deploy Job", "rectangle", 3, 918, 120, 168, 84),
      node("prod", "Production", "hexagon", 6, 1150, 116, 164, 92),
    ]),
    edges: createTemplateEdges([
      edge("repo-ci", "repo", "ci", "right", "left"),
      edge("ci-tests", "ci", "tests", "right", "left"),
      edge("tests-artifacts", "tests", "artifacts", "right", "left"),
      edge("artifacts-deploy", "artifacts", "deploy", "right", "left"),
      edge("deploy-prod", "deploy", "prod", "right", "left"),
    ]),
  },
  {
    id: "event-driven-system",
    name: "Event-Driven System",
    description:
      "Event ingestion, stream processing, durable storage, projections, and subscribers.",
    nodes: createTemplateNodes([
      node("producers", "Event Producers", "hexagon", 1, 0, 150, 172, 92),
      node("ingestion", "Ingestion API", "pill", 7, 250, 160, 168, 72),
      node("stream", "Event Stream", "diamond", 2, 500, 124, 140, 140),
      node("processor", "Stream Processor", "rectangle", 3, 748, 0, 184, 88),
      node("warehouse", "Warehouse", "cylinder", 6, 748, 156, 156, 100),
      node("projection", "Read Model", "cylinder", 5, 1002, 20, 156, 96),
      node("subscribers", "Subscribers", "hexagon", 4, 1000, 180, 172, 92),
    ]),
    edges: createTemplateEdges([
      edge("producers-ingestion", "producers", "ingestion", "right", "left"),
      edge("ingestion-stream", "ingestion", "stream", "right", "left"),
      edge("stream-processor", "stream", "processor", "right", "left"),
      edge("stream-warehouse", "stream", "warehouse", "right", "left"),
      edge(
        "processor-projection",
        "processor",
        "projection",
        "right",
        "left"
      ),
      edge(
        "processor-subscribers",
        "processor",
        "subscribers",
        "right",
        "left"
      ),
    ]),
  },
]

export function cloneTemplateNodes(template: CanvasTemplate): CanvasNode[] {
  return template.nodes.map((node) => ({
    ...node,
    position: { ...node.position },
    data: {
      ...node.data,
      color: { ...node.data.color },
    },
    selected: false,
  }))
}

export function cloneTemplateEdges(template: CanvasTemplate): CanvasEdge[] {
  return template.edges.map((edge) => ({
    ...edge,
    data: { ...edge.data },
    selected: false,
  }))
}

function createTemplateNodes(nodes: TemplateNodeInput[]): CanvasNode[] {
  return nodes.map((node) => ({
    id: node.id,
    type: CANVAS_NODE_TYPE,
    position: node.position,
    width: node.size.width,
    height: node.size.height,
    initialWidth: node.size.width,
    initialHeight: node.size.height,
    data: {
      label: node.label,
      color: NODE_COLORS[node.colorIndex] ?? NODE_COLORS[0],
      shape: node.shape,
    },
  }))
}

function createTemplateEdges(edges: TemplateEdgeInput[]): CanvasEdge[] {
  return edges.map((edge) => ({
    id: edge.id,
    type: CANVAS_EDGE_TYPE,
    source: edge.source,
    sourceHandle: edge.sourceHandle,
    target: edge.target,
    targetHandle: edge.targetHandle,
    data: {},
  }))
}

function node(
  id: string,
  label: string,
  shape: CanvasNodeShape,
  colorIndex: number,
  x: number,
  y: number,
  width: number,
  height: number
): TemplateNodeInput {
  return {
    id,
    label,
    shape,
    colorIndex,
    position: { x, y },
    size: { width, height },
  }
}

function edge(
  id: string,
  source: string,
  target: string,
  sourceHandle: TemplateHandleId,
  targetHandle: TemplateHandleId
): TemplateEdgeInput {
  return { id, source, sourceHandle, target, targetHandle }
}

import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { Liveblocks } from "@liveblocks/node"
import { mutateFlow, type MutableFlow } from "@liveblocks/react-flow/node"
import { logger, metadata, task } from "@trigger.dev/sdk/v3"
import { generateText, jsonSchema, stepCountIs, tool } from "ai"

import { prisma } from "@/lib/prisma"
import {
  AI_DESIGN_AGENT_INFO,
  AI_DESIGN_AGENT_USER_ID,
  type AiStatusEvent,
} from "@/types/ai"
import { AI_STATUS_FEED_ID, type AiStatusKind } from "@/types/tasks"
import {
  CANVAS_EDGE_TYPE,
  CANVAS_NODE_TYPE,
  DEFAULT_NODE_COLOR,
  DEFAULT_NODE_SIZES,
  NODE_COLORS,
  NODE_SHAPES,
  type CanvasEdge,
  type CanvasNode,
  type CanvasNodeColor,
  type CanvasNodeShape,
  type CanvasSnapshot,
} from "@/types/canvas"

export interface DesignAgentPayload {
  data?: unknown
  id?: string
  input?: unknown
  payload?: unknown
  projectId?: string
  projectID?: string
  project_id?: string
  project?: unknown
  prompt: string
  room?: unknown
  roomId?: string
  roomID?: string
  room_id?: string
  url?: string
}

interface DesignAgentProjectContext {
  description: string | null
  id: string
  name: string
}

interface NormalizedDesignAgentPayload {
  projectId: string
  prompt: string
  roomId: string
}

interface DesignAgentPlan {
  actions: DesignAgentAction[]
  summary: string
}

type DesignAgentAction =
  | AddNodeAction
  | MoveNodeAction
  | ResizeNodeAction
  | UpdateNodeDataAction
  | DeleteNodeAction
  | AddEdgeAction
  | DeleteEdgeAction

interface AddNodeAction {
  colorIndex?: number
  height?: number
  id?: string
  label: string
  shape?: CanvasNodeShape
  type: "add_node"
  width?: number
  x: number
  y: number
}

type AddNodeInput = Omit<AddNodeAction, "type">
type MoveNodeInput = Omit<MoveNodeAction, "type">
type ResizeNodeInput = Omit<ResizeNodeAction, "type">
type UpdateNodeDataInput = Omit<UpdateNodeDataAction, "type">
type DeleteNodeInput = Omit<DeleteNodeAction, "type">
type AddEdgeInput = Omit<AddEdgeAction, "type">
type DeleteEdgeInput = Omit<DeleteEdgeAction, "type">

interface MoveNodeAction {
  id: string
  type: "move_node"
  x: number
  y: number
}

interface ResizeNodeAction {
  height: number
  id: string
  type: "resize_node"
  width: number
}

interface UpdateNodeDataAction {
  colorIndex?: number
  id: string
  label?: string
  shape?: CanvasNodeShape
  type: "update_node_data"
}

interface DeleteNodeAction {
  id: string
  type: "delete_node"
}

interface AddEdgeAction {
  id?: string
  label?: string
  source: string
  sourceHandle?: CanvasHandlePosition
  target: string
  targetHandle?: CanvasHandlePosition
  type: "add_edge"
}

interface DeleteEdgeAction {
  id: string
  type: "delete_edge"
}

interface DesignAgentApplyResult {
  appliedActions: number
  skippedActions: number
}

type CanvasHandlePosition = "top" | "right" | "bottom" | "left"
type AiPresenceCursor = { x: number; y: number } | null
type CanvasMutableFlow = MutableFlow<CanvasNode, CanvasEdge>

const AI_PRESENCE_TTL_SECONDS = 90
const AI_PRESENCE_CLEAR_TTL_SECONDS = 2
const MAX_ACTIONS = 28
const MAX_EDGE_REPAIR_ACTIONS = 16
const MIN_NODE_WIDTH = 96
const MIN_NODE_HEIGHT = 56
const MAX_NODE_WIDTH = 360
const MAX_NODE_HEIGHT = 240

const liveblocksGlobal = globalThis as typeof globalThis & {
  designAgentLiveblocks?: Liveblocks
}

const canvasActionFieldSchemas = {
  colorIndex: {
    type: "integer" as const,
    minimum: 0,
    maximum: NODE_COLORS.length - 1,
  },
  height: {
    type: "number" as const,
    minimum: MIN_NODE_HEIGHT,
    maximum: MAX_NODE_HEIGHT,
  },
  id: {
    type: "string" as const,
    minLength: 1,
    maxLength: 80,
  },
  label: {
    type: "string" as const,
    minLength: 1,
    maxLength: 80,
  },
  shape: {
    type: "string" as const,
    enum: [...NODE_SHAPES],
  },
  source: {
    type: "string" as const,
    minLength: 1,
    maxLength: 80,
  },
  sourceHandle: {
    type: "string" as const,
    enum: ["top", "right", "bottom", "left"],
  },
  target: {
    type: "string" as const,
    minLength: 1,
    maxLength: 80,
  },
  targetHandle: {
    type: "string" as const,
    enum: ["top", "right", "bottom", "left"],
  },
  width: {
    type: "number" as const,
    minimum: MIN_NODE_WIDTH,
    maximum: MAX_NODE_WIDTH,
  },
  x: {
    type: "number" as const,
  },
  y: {
    type: "number" as const,
  },
}

const designAgentTools = {
  addNode: tool({
    description:
      "Add a new architecture component node to the canvas. Use stable ids so later edge tools can reference this node.",
    inputSchema: jsonSchema<AddNodeInput>({
      type: "object",
      additionalProperties: false,
      required: ["label", "x", "y"],
      properties: {
        colorIndex: canvasActionFieldSchemas.colorIndex,
        height: canvasActionFieldSchemas.height,
        id: canvasActionFieldSchemas.id,
        label: canvasActionFieldSchemas.label,
        shape: canvasActionFieldSchemas.shape,
        width: canvasActionFieldSchemas.width,
        x: canvasActionFieldSchemas.x,
        y: canvasActionFieldSchemas.y,
      },
    }),
  }),
  moveNode: tool({
    description: "Move an existing canvas node to a better layout position.",
    inputSchema: jsonSchema<MoveNodeInput>({
      type: "object",
      additionalProperties: false,
      required: ["id", "x", "y"],
      properties: {
        id: canvasActionFieldSchemas.id,
        x: canvasActionFieldSchemas.x,
        y: canvasActionFieldSchemas.y,
      },
    }),
  }),
  resizeNode: tool({
    description: "Resize an existing canvas node when its role needs more room.",
    inputSchema: jsonSchema<ResizeNodeInput>({
      type: "object",
      additionalProperties: false,
      required: ["height", "id", "width"],
      properties: {
        height: canvasActionFieldSchemas.height,
        id: canvasActionFieldSchemas.id,
        width: canvasActionFieldSchemas.width,
      },
    }),
  }),
  updateNodeData: tool({
    description:
      "Update an existing node label, shape, or palette color without moving it.",
    inputSchema: jsonSchema<UpdateNodeDataInput>({
      type: "object",
      additionalProperties: false,
      required: ["id"],
      properties: {
        colorIndex: canvasActionFieldSchemas.colorIndex,
        id: canvasActionFieldSchemas.id,
        label: canvasActionFieldSchemas.label,
        shape: canvasActionFieldSchemas.shape,
      },
    }),
  }),
  deleteNode: tool({
    description: "Delete an existing canvas node that should no longer exist.",
    inputSchema: jsonSchema<DeleteNodeInput>({
      type: "object",
      additionalProperties: false,
      required: ["id"],
      properties: {
        id: canvasActionFieldSchemas.id,
      },
    }),
  }),
  addEdge: tool({
    description:
      "Add a directional relationship between two existing or newly added nodes.",
    inputSchema: jsonSchema<AddEdgeInput>({
      type: "object",
      additionalProperties: false,
      required: ["source", "target"],
      properties: {
        id: canvasActionFieldSchemas.id,
        label: canvasActionFieldSchemas.label,
        source: canvasActionFieldSchemas.source,
        sourceHandle: canvasActionFieldSchemas.sourceHandle,
        target: canvasActionFieldSchemas.target,
        targetHandle: canvasActionFieldSchemas.targetHandle,
      },
    }),
  }),
  deleteEdge: tool({
    description: "Delete an existing canvas edge that should no longer exist.",
    inputSchema: jsonSchema<DeleteEdgeInput>({
      type: "object",
      additionalProperties: false,
      required: ["id"],
      properties: {
        id: canvasActionFieldSchemas.id,
      },
    }),
  }),
}

export const designAgent = task({
  id: "design-agent",
  run: async (payload: DesignAgentPayload) => {
    const payloadKeys = getPayloadKeys(payload)
    let liveblocks: Liveblocks | null = null
    let projectId = ""
    let prompt = ""
    let roomId = ""
    let roomReady = false

    metadata.set("status", "starting").set("payloadKeys", payloadKeys)

    try {
      const normalizedPayload = parseDesignAgentPayload(payload)

      projectId = normalizedPayload.projectId
      prompt = normalizedPayload.prompt
      roomId = normalizedPayload.roomId
      liveblocks = getDesignAgentLiveblocksClient()

      logger.info("Design agent task started", {
        payloadKeys,
        projectId,
        prompt,
        roomId,
      })

      metadata.set("projectId", projectId).set("roomId", roomId)

      const project = await readProjectContext(projectId)

      assertDesignAgentRoomMatchesProject(roomId, project.id)
      await ensureDesignAgentRoom(liveblocks, project)
      roomReady = true

      await publishStatus(
        liveblocks,
        roomId,
        "start",
        "Ghost AI joined the canvas."
      )
      await setAiPresence(liveblocks, roomId, {
        cursor: { x: 360, y: 132 },
        thinking: true,
        ttl: AI_PRESENCE_TTL_SECONDS,
      })

      const snapshot = await readCanvasSnapshot(liveblocks, roomId)

      metadata
        .set("status", "planning")
        .set("existingNodes", snapshot.nodes.length)
        .set("existingEdges", snapshot.edges.length)

      await publishStatus(
        liveblocks,
        roomId,
        "processing",
        "Interpreting the prompt and current canvas."
      )
      await setAiPresence(liveblocks, roomId, {
        cursor: { x: 440, y: 188 },
        thinking: true,
        ttl: AI_PRESENCE_TTL_SECONDS,
      })

      const plan = await generateDesignPlan(prompt, project, snapshot)

      metadata
        .set("status", "applying")
        .set("plannedActions", plan.actions.length)

      await publishStatus(
        liveblocks,
        roomId,
        "processing",
        `Applying ${plan.actions.length} canvas update${
          plan.actions.length === 1 ? "" : "s"
        }.`
      )
      await setAiPresence(liveblocks, roomId, {
        cursor: { x: 520, y: 248 },
        thinking: true,
        ttl: AI_PRESENCE_TTL_SECONDS,
      })

      const applyResult = await applyDesignPlan(
        liveblocks,
        roomId,
        plan.actions
      )

      metadata
        .set("status", "completed")
        .set("appliedActions", applyResult.appliedActions)
        .set("skippedActions", applyResult.skippedActions)

      await publishStatus(
        liveblocks,
        roomId,
        "complete",
        `Canvas updated: ${plan.summary}`
      )

      logger.info("Design agent task completed", {
        appliedActions: applyResult.appliedActions,
        projectId,
        roomId,
        skippedActions: applyResult.skippedActions,
      })

      return {
        ...applyResult,
        projectId,
        roomId,
        summary: plan.summary,
      }
    } catch (error) {
      const errorMessage = getErrorMessage(error)

      metadata.set("status", "error").set("error", errorMessage)
      logger.error("Design agent task failed", {
        error: errorMessage,
        payloadKeys,
        projectId,
        roomId,
      })

      if (roomReady && liveblocks) {
        await publishStatus(
          liveblocks,
          roomId,
          "error",
          "Ghost AI could not update the canvas. Try a smaller or clearer prompt."
        )
      }

      throw error
    } finally {
      if (roomReady && liveblocks) {
        await clearAiPresence(liveblocks, roomId)
      }
    }
  },
})

function parseDesignAgentPayload(
  payload: DesignAgentPayload
): NormalizedDesignAgentPayload {
  if (!isRecord(payload)) {
    throw new Error(
      'Design agent payload must be a JSON object with "prompt" and "roomId".'
    )
  }

  const prompt = readPayloadString(payload, [
    "prompt",
    "message",
    "request",
    "description",
  ])
  const projectId = readPayloadString(payload, [
    "projectId",
    "projectID",
    "project_id",
    "project",
  ])
  const roomId = readPayloadString(payload, [
    "roomId",
    "roomID",
    "room_id",
    "room",
    "id",
    "url",
  ])
  const resolvedProjectId = projectId || roomId
  const resolvedRoomId = roomId || projectId

  if (!prompt) {
    throw new Error("Design prompt is required")
  }

  if (!resolvedProjectId || !resolvedRoomId) {
    throw new Error(
      `Project or room ID is required. Received payload keys: ${getPayloadKeys(
        payload
      ).join(", ") || "none"}. For Trigger.dev dashboard tests, use {"prompt":"Describe the system","roomId":"<id from /editor/<id>"} or provide both "projectId" and "roomId".`
    )
  }

  return {
    projectId: resolvedProjectId,
    prompt,
    roomId: resolvedRoomId,
  }
}

function parseRequiredString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function readPayloadString(payload: Record<string, unknown>, keys: string[]) {
  for (const source of getPayloadSources(payload)) {
    for (const key of keys) {
      const value = source[key]
      const parsedValue =
        key === "url" ? parseEditorProjectId(value) : parseRequiredString(value)

      if (parsedValue) {
        return parsedValue
      }
    }
  }

  return ""
}

function getPayloadSources(payload: Record<string, unknown>) {
  const sources = [payload]

  for (const key of ["payload", "data", "input", "body"]) {
    const value = payload[key]

    if (isRecord(value)) {
      sources.push(value)
    }
  }

  return sources
}

function parseEditorProjectId(value: unknown) {
  const rawValue = parseRequiredString(value)

  if (!rawValue) {
    return ""
  }

  const match = rawValue.match(/\/editor\/([^/?#]+)/)

  return match ? decodeURIComponent(match[1]) : rawValue
}

function getPayloadKeys(payload: unknown) {
  if (!isRecord(payload)) {
    return []
  }

  return Object.keys(payload)
}

function getDesignAgentLiveblocksClient() {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY

  if (!secret) {
    throw new Error("LIVEBLOCKS_SECRET_KEY is required")
  }

  if (!liveblocksGlobal.designAgentLiveblocks) {
    liveblocksGlobal.designAgentLiveblocks = new Liveblocks({ secret })
  }

  return liveblocksGlobal.designAgentLiveblocks
}

function assertDesignAgentRoomMatchesProject(roomId: string, projectId: string) {
  if (roomId !== projectId) {
    throw new Error("Room does not match project")
  }
}

async function ensureDesignAgentRoom(
  liveblocks: Liveblocks,
  project: DesignAgentProjectContext
) {
  await liveblocks.getOrCreateRoom(project.id, {
    defaultAccesses: [],
    metadata: {
      projectId: project.id,
      projectName: project.name,
    },
  })
}

async function readProjectContext(
  projectId: string
): Promise<DesignAgentProjectContext> {
  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      description: true,
      id: true,
      name: true,
    },
  })

  if (!project) {
    throw new Error("Project not found")
  }

  return project
}

async function readCanvasSnapshot(
  liveblocks: Liveblocks,
  roomId: string
): Promise<CanvasSnapshot> {
  let snapshot: CanvasSnapshot = {
    edges: [],
    nodes: [],
  }

  await mutateFlow<CanvasNode, CanvasEdge>(
    {
      client: liveblocks,
      roomId,
    },
    (flow) => {
      const currentSnapshot = flow.toJSON()

      snapshot = {
        edges: [...currentSnapshot.edges],
        nodes: [...currentSnapshot.nodes],
      }
    }
  )

  return snapshot
}

async function generateDesignPlan(
  prompt: string,
  project: DesignAgentProjectContext,
  snapshot: CanvasSnapshot
): Promise<DesignAgentPlan> {
  const google = getGoogleProvider()
  const result = await generateText({
    model: google("gemini-2.5-flash"),
    tools: designAgentTools,
    toolChoice: "required",
    stopWhen: stepCountIs(1),
    temperature: 0.2,
    system: buildDesignAgentSystemPrompt(),
    prompt: buildDesignAgentUserPrompt(prompt, project, snapshot),
  })
  const actions = result.toolCalls
    .map(parseDesignAgentToolCall)
    .filter((action): action is DesignAgentAction => action !== null)
    .slice(0, MAX_ACTIONS)
  const completedActions = ensurePlanHasConnectableNodesAndEdges(
    actions,
    snapshot
  )

  if (completedActions.length === 0) {
    throw new Error(
      `No valid canvas actions generated.${
        result.text.trim() ? ` Model text: ${result.text.trim()}` : ""
      }`
    )
  }

  return {
    actions: completedActions,
    summary: summarizeDesignActions(completedActions, result.text),
  }
}

function getGoogleProvider() {
  const apiKey = process.env.GOOGLE_AI_API_KEY

  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY is required")
  }

  return createGoogleGenerativeAI({ apiKey })
}

function buildDesignAgentSystemPrompt() {
  return [
    "You are Ghost AI, a system design collaborator editing a shared architecture canvas.",
    "Call canvas action tools to modify the canvas. Do not answer with only text.",
    `Call no more than ${MAX_ACTIONS} tools total.`,
    `Allowed node shapes: ${NODE_SHAPES.join(", ")}.`,
    "Use colorIndex values 0 through 7 from the fixed palette; never invent colors.",
    "Prefer left-to-right layouts. Keep related nodes 220-280 canvas units apart horizontally and 130-190 units apart vertically.",
    "Use concise technical labels under 5 words.",
    "A design with two or more nodes is incomplete unless it also includes addEdge calls.",
    "For every important request, data flow, event, cache lookup, or dependency, add a directional edge.",
    "When adding edges, set source to the source node ID and target to the target node ID. Use sourceHandle right and targetHandle left by default.",
    "Give addEdge calls short text labels such as Authenticates, Reads, Writes, Publishes, or Cache miss.",
    "For a new design, add the important components first, then add edges between their stable IDs.",
    "Use update, move, resize, and delete actions only when they clearly match the user's prompt.",
  ].join("\n")
}

function buildDesignAgentUserPrompt(
  prompt: string,
  project: DesignAgentProjectContext,
  snapshot: CanvasSnapshot
) {
  const existingNodes = snapshot.nodes.map((node) => ({
    colorIndex: NODE_COLORS.findIndex(
      (color) =>
        color.fill === node.data.color.fill &&
        color.text === node.data.color.text
    ),
    height: node.height ?? node.initialHeight,
    id: node.id,
    label: node.data.label,
    shape: node.data.shape,
    width: node.width ?? node.initialWidth,
    x: node.position.x,
    y: node.position.y,
  }))
  const existingEdges = snapshot.edges.map((edge) => ({
    id: edge.id,
    label: typeof edge.label === "string" ? edge.label : undefined,
    source: edge.source,
    target: edge.target,
  }))

  return JSON.stringify(
    {
      currentCanvas: {
        edges: existingEdges,
        nodes: existingNodes,
      },
      project,
      request: prompt,
    },
    null,
    2
  )
}

function parseDesignAgentToolCall(toolCall: {
  input: unknown
  toolName: string
}): DesignAgentAction | null {
  const actionTypeByToolName: Record<string, DesignAgentAction["type"]> = {
    addEdge: "add_edge",
    addNode: "add_node",
    deleteEdge: "delete_edge",
    deleteNode: "delete_node",
    moveNode: "move_node",
    resizeNode: "resize_node",
    updateNodeData: "update_node_data",
  }
  const type = actionTypeByToolName[toolCall.toolName]

  if (!type || !isRecord(toolCall.input)) {
    return null
  }

  return parseDesignAgentAction({
    ...toolCall.input,
    type,
  })
}

function summarizeDesignActions(actions: DesignAgentAction[], text: string) {
  const trimmedText = normalizeLabel(text)

  if (trimmedText) {
    return trimmedText
  }

  const addedNodes = actions.filter((action) => action.type === "add_node").length
  const addedEdges = actions.filter((action) => action.type === "add_edge").length
  const updatedNodes = actions.filter(
    (action) =>
      action.type === "move_node" ||
      action.type === "resize_node" ||
      action.type === "update_node_data"
  ).length
  const deletedItems = actions.filter(
    (action) => action.type === "delete_node" || action.type === "delete_edge"
  ).length
  const parts = [
    addedNodes > 0 ? `${addedNodes} node${addedNodes === 1 ? "" : "s"}` : "",
    addedEdges > 0 ? `${addedEdges} edge${addedEdges === 1 ? "" : "s"}` : "",
    updatedNodes > 0
      ? `${updatedNodes} node update${updatedNodes === 1 ? "" : "s"}`
      : "",
    deletedItems > 0
      ? `${deletedItems} removal${deletedItems === 1 ? "" : "s"}`
      : "",
  ].filter(Boolean)

  return parts.length > 0
    ? `Applied ${parts.join(", ")}.`
    : "Applied canvas updates."
}

function ensurePlanHasConnectableNodesAndEdges(
  actions: DesignAgentAction[],
  snapshot: CanvasSnapshot
): DesignAgentAction[] {
  const actionsWithNodeIds = ensureAddedNodesHaveStableIds(actions)

  if (actionsWithNodeIds.some((action) => action.type === "add_edge")) {
    return actionsWithNodeIds
  }

  const repairEdges = createMissingEdgeActions(actionsWithNodeIds, snapshot)

  if (repairEdges.length === 0) {
    return actionsWithNodeIds
  }

  return [...actionsWithNodeIds, ...repairEdges]
}

function ensureAddedNodesHaveStableIds(
  actions: DesignAgentAction[]
): DesignAgentAction[] {
  let generatedNodeIdIndex = 0

  return actions.map((action) => {
    if (action.type !== "add_node" || action.id) {
      return action
    }

    generatedNodeIdIndex += 1

    return {
      ...action,
      id: `ai-${slugify(action.label) || "node"}-${generatedNodeIdIndex}`,
    }
  })
}

interface EdgeRepairNodeRef {
  id: string
  label: string
  x: number
  y: number
}

function createMissingEdgeActions(
  actions: DesignAgentAction[],
  snapshot: CanvasSnapshot
): AddEdgeAction[] {
  const addedNodes = actions
    .filter((action): action is AddNodeAction => action.type === "add_node")
    .map((action) => ({
      id: action.id
        ? sanitizeCanvasId(action.id)
        : sanitizeCanvasId(action.label),
      label: normalizeLabel(action.label),
      x: normalizeCoordinate(action.x),
      y: normalizeCoordinate(action.y),
    }))
    .filter((node) => node.id)

  if (addedNodes.length < 2 && snapshot.nodes.length + addedNodes.length < 2) {
    return []
  }

  const existingNodes = snapshot.nodes.map((node) => ({
    id: node.id,
    label: node.data.label,
    x: node.position.x,
    y: node.position.y,
  }))
  const repairNodes =
    addedNodes.length >= 2 ? addedNodes : [...existingNodes, ...addedNodes]
  const orderedNodes = [...repairNodes].sort(
    (left, right) => left.x - right.x || left.y - right.y
  )
  const repairEdges: AddEdgeAction[] = []

  for (
    let index = 0;
    index < orderedNodes.length - 1 &&
    repairEdges.length < MAX_EDGE_REPAIR_ACTIONS;
    index += 1
  ) {
    const source = orderedNodes[index]
    const target = orderedNodes[index + 1]

    if (source.id === target.id) {
      continue
    }

    const handles = getHandlesForEdgeRepair(source, target)

    repairEdges.push({
      id: `ai-edge-${slugify(source.id)}-${slugify(target.id)}`,
      label: inferEdgeRepairLabel(source.label, target.label),
      source: source.id,
      sourceHandle: handles.sourceHandle,
      target: target.id,
      targetHandle: handles.targetHandle,
      type: "add_edge",
    })
  }

  return repairEdges
}

function getHandlesForEdgeRepair(
  source: EdgeRepairNodeRef,
  target: EdgeRepairNodeRef
): Pick<AddEdgeAction, "sourceHandle" | "targetHandle"> {
  const horizontalDistance = target.x - source.x
  const verticalDistance = target.y - source.y

  if (Math.abs(horizontalDistance) >= Math.abs(verticalDistance)) {
    return horizontalDistance >= 0
      ? { sourceHandle: "right", targetHandle: "left" }
      : { sourceHandle: "left", targetHandle: "right" }
  }

  return verticalDistance >= 0
    ? { sourceHandle: "bottom", targetHandle: "top" }
    : { sourceHandle: "top", targetHandle: "bottom" }
}

function inferEdgeRepairLabel(sourceLabel: string, targetLabel: string) {
  const target = targetLabel.toLowerCase()

  if (target.includes("cache")) {
    return "Reads"
  }

  if (
    target.includes("queue") ||
    target.includes("bus") ||
    target.includes("stream")
  ) {
    return "Publishes"
  }

  if (
    target.includes("database") ||
    target.includes("db") ||
    target.includes("store") ||
    target.includes("storage")
  ) {
    return "Stores"
  }

  if (sourceLabel.toLowerCase().includes("user")) {
    return "Requests"
  }

  return "Uses"
}

async function applyDesignPlan(
  liveblocks: Liveblocks,
  roomId: string,
  actions: DesignAgentAction[]
): Promise<DesignAgentApplyResult> {
  let appliedActions = 0
  let skippedActions = 0

  await mutateFlow<CanvasNode, CanvasEdge>(
    {
      client: liveblocks,
      roomId,
    },
    (flow) => {
      const nodeAliases = new Map<string, string>()
      const edgeAliases = new Map<string, string>()

      for (const [index, action] of actions.entries()) {
        const didApply = applyDesignAction({
          action,
          edgeAliases,
          flow,
          nodeAliases,
          sequence: index + 1,
        })

        if (didApply) {
          appliedActions += 1
        } else {
          skippedActions += 1
        }
      }
    }
  )

  return { appliedActions, skippedActions }
}

function applyDesignAction({
  action,
  edgeAliases,
  flow,
  nodeAliases,
  sequence,
}: {
  action: DesignAgentAction
  edgeAliases: Map<string, string>
  flow: CanvasMutableFlow
  nodeAliases: Map<string, string>
  sequence: number
}) {
  switch (action.type) {
    case "add_node": {
      const shape = getValidShape(action.shape)
      const size = getNodeSize(shape, action.width, action.height)
      const requestedId = action.id ? sanitizeCanvasId(action.id) : ""
      const nodeId = createUniqueNodeId(flow, requestedId, action.label, sequence)
      const color = getNodeColor(action.colorIndex)
      const node: CanvasNode = {
        data: {
          color,
          label: normalizeLabel(action.label),
          shape,
        },
        height: size.height,
        id: nodeId,
        initialHeight: size.height,
        initialWidth: size.width,
        position: {
          x: normalizeCoordinate(action.x),
          y: normalizeCoordinate(action.y),
        },
        type: CANVAS_NODE_TYPE,
        width: size.width,
      }

      flow.addNode(node)

      if (requestedId) {
        nodeAliases.set(requestedId, nodeId)
      }

      const labelAlias = sanitizeCanvasId(action.label)

      if (labelAlias) {
        nodeAliases.set(labelAlias, nodeId)
      }

      return true
    }

    case "move_node": {
      const nodeId = resolveNodeId(action.id, nodeAliases)

      if (!flow.getNode(nodeId)) {
        return false
      }

      flow.updateNode(nodeId, {
        position: {
          x: normalizeCoordinate(action.x),
          y: normalizeCoordinate(action.y),
        },
      })

      return true
    }

    case "resize_node": {
      const nodeId = resolveNodeId(action.id, nodeAliases)
      const existingNode = flow.getNode(nodeId)

      if (!existingNode) {
        return false
      }

      const size = getNodeSize(
        existingNode.data.shape,
        action.width,
        action.height
      )

      flow.updateNode(nodeId, {
        height: size.height,
        width: size.width,
      })

      return true
    }

    case "update_node_data": {
      const nodeId = resolveNodeId(action.id, nodeAliases)
      const existingNode = flow.getNode(nodeId)

      if (!existingNode) {
        return false
      }

      flow.updateNodeData(nodeId, {
        color: getNodeColor(action.colorIndex, existingNode.data.color),
        label:
          typeof action.label === "string"
            ? normalizeLabel(action.label)
            : existingNode.data.label,
        shape: getValidShape(action.shape, existingNode.data.shape),
      })

      return true
    }

    case "delete_node": {
      const nodeId = resolveNodeId(action.id, nodeAliases)

      if (!flow.getNode(nodeId)) {
        return false
      }

      const connectedEdgeIds = flow.edges
        .filter((edge) => edge.source === nodeId || edge.target === nodeId)
        .map((edge) => edge.id)

      flow.removeEdges(connectedEdgeIds)
      flow.removeNode(nodeId)

      return true
    }

    case "add_edge": {
      const sourceId = resolveNodeId(action.source, nodeAliases)
      const targetId = resolveNodeId(action.target, nodeAliases)

      if (!flow.getNode(sourceId) || !flow.getNode(targetId)) {
        return false
      }

      const requestedId = action.id ? sanitizeCanvasId(action.id) : ""
      const edgeId = createUniqueEdgeId(
        flow,
        requestedId,
        sourceId,
        targetId,
        sequence
      )
      const edge: CanvasEdge = {
        data: {},
        id: edgeId,
        label: action.label ? normalizeLabel(action.label) : undefined,
        source: sourceId,
        sourceHandle: action.sourceHandle ?? "right",
        target: targetId,
        targetHandle: action.targetHandle ?? "left",
        type: CANVAS_EDGE_TYPE,
      }

      flow.addEdge(edge)

      if (requestedId) {
        edgeAliases.set(requestedId, edgeId)
      }

      return true
    }

    case "delete_edge": {
      const edgeId = resolveEdgeId(action.id, edgeAliases)

      if (!flow.getEdge(edgeId)) {
        return false
      }

      flow.removeEdge(edgeId)
      return true
    }
  }
}

function createUniqueNodeId(
  flow: CanvasMutableFlow,
  requestedId: string,
  label: string,
  sequence: number
) {
  const baseId =
    requestedId || `ai-${slugify(label) || "node"}-${Date.now()}-${sequence}`

  return createUniqueId(baseId, (id) => flow.getNode(id) !== undefined)
}

function createUniqueEdgeId(
  flow: CanvasMutableFlow,
  requestedId: string,
  sourceId: string,
  targetId: string,
  sequence: number
) {
  const baseId =
    requestedId || `ai-edge-${slugify(sourceId)}-${slugify(targetId)}-${sequence}`

  return createUniqueId(baseId, (id) => flow.getEdge(id) !== undefined)
}

function createUniqueId(baseId: string, exists: (id: string) => boolean) {
  const safeBaseId = sanitizeCanvasId(baseId) || `ai-item-${Date.now()}`

  if (!exists(safeBaseId)) {
    return safeBaseId
  }

  for (let index = 2; index < 100; index += 1) {
    const candidate = `${safeBaseId}-${index}`

    if (!exists(candidate)) {
      return candidate
    }
  }

  return `${safeBaseId}-${Date.now()}`
}

function resolveNodeId(id: string, aliases: Map<string, string>) {
  const sanitizedId = sanitizeCanvasId(id)

  return aliases.get(sanitizedId) ?? sanitizedId
}

function resolveEdgeId(id: string, aliases: Map<string, string>) {
  const sanitizedId = sanitizeCanvasId(id)

  return aliases.get(sanitizedId) ?? sanitizedId
}

function getValidShape(
  shape?: CanvasNodeShape,
  fallback: CanvasNodeShape = "rectangle"
) {
  return shape ? shape : fallback
}

function getNodeColor(
  colorIndex?: number,
  fallback: CanvasNodeColor = DEFAULT_NODE_COLOR
) {
  if (
    typeof colorIndex !== "number" ||
    !Number.isInteger(colorIndex) ||
    colorIndex < 0 ||
    colorIndex >= NODE_COLORS.length
  ) {
    return fallback
  }

  return NODE_COLORS[colorIndex]
}

function getNodeSize(
  shape: CanvasNodeShape,
  width?: number,
  height?: number
) {
  const defaultSize = DEFAULT_NODE_SIZES[shape]

  return {
    height: clampNumber(height, MIN_NODE_HEIGHT, MAX_NODE_HEIGHT, defaultSize.height),
    width: clampNumber(width, MIN_NODE_WIDTH, MAX_NODE_WIDTH, defaultSize.width),
  }
}

function normalizeCoordinate(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.round(value)
}

function normalizeLabel(label: string) {
  return label.trim().replace(/\s+/g, " ").slice(0, 80)
}

function sanitizeCanvasId(id: string) {
  return id
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

function slugify(value: string) {
  return sanitizeCanvasId(value).slice(0, 36)
}

function clampNumber(
  value: number | undefined,
  minimum: number,
  maximum: number,
  fallback: number
) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback
  }

  return Math.min(Math.max(Math.round(value), minimum), maximum)
}

async function publishStatus(
  liveblocks: Liveblocks,
  roomId: string,
  kind: AiStatusKind,
  message: string
) {
  const event: AiStatusEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    kind,
    message,
    timestamp: new Date().toISOString(),
    type: "ai-status",
  }

  await liveblocks.broadcastEvent(roomId, event)
  await ensureAiStatusFeed(liveblocks, roomId)
  await liveblocks.createFeedMessage({
    roomId,
    feedId: AI_STATUS_FEED_ID,
    data: {
      kind,
      text: message,
      timestamp: event.timestamp,
      type: "ai-status",
    },
  })
  metadata.append("statusFeed", {
    kind,
    message,
    timestamp: event.timestamp,
  })
}

async function ensureAiStatusFeed(liveblocks: Liveblocks, roomId: string) {
  try {
    await liveblocks.createFeed({
      roomId,
      feedId: AI_STATUS_FEED_ID,
      metadata: {
        name: "AI status feed",
      },
    })
  } catch {
    // The room-scoped feed can already exist from a previous sidebar session.
  }
}

async function setAiPresence(
  liveblocks: Liveblocks,
  roomId: string,
  {
    cursor,
    thinking,
    ttl,
  }: {
    cursor: AiPresenceCursor
    thinking: boolean
    ttl: number
  }
) {
  await liveblocks.setPresence(roomId, {
    data: {
      cursor,
      thinking,
    },
    ttl,
    userId: AI_DESIGN_AGENT_USER_ID,
    userInfo: AI_DESIGN_AGENT_INFO,
  })
}

async function clearAiPresence(liveblocks: Liveblocks, roomId: string) {
  try {
    await setAiPresence(liveblocks, roomId, {
      cursor: null,
      thinking: false,
      ttl: AI_PRESENCE_CLEAR_TTL_SECONDS,
    })
  } catch (error) {
    logger.warn("Failed to clear AI presence", {
      error: getErrorMessage(error),
      roomId,
    })
  }
}

function parseDesignAgentAction(value: unknown): DesignAgentAction | null {
  if (!isRecord(value) || typeof value.type !== "string") {
    return null
  }

  switch (value.type) {
    case "add_node":
      if (
        typeof value.label !== "string" ||
        !isFiniteNumber(value.x) ||
        !isFiniteNumber(value.y)
      ) {
        return null
      }

      return {
        colorIndex: parseOptionalInteger(value.colorIndex),
        height: parseOptionalNumber(value.height),
        id: parseOptionalString(value.id),
        label: value.label,
        shape: parseOptionalShape(value.shape),
        type: "add_node",
        width: parseOptionalNumber(value.width),
        x: value.x,
        y: value.y,
      }

    case "move_node":
      if (
        typeof value.id !== "string" ||
        !isFiniteNumber(value.x) ||
        !isFiniteNumber(value.y)
      ) {
        return null
      }

      return {
        id: value.id,
        type: "move_node",
        x: value.x,
        y: value.y,
      }

    case "resize_node":
      if (
        typeof value.id !== "string" ||
        !isFiniteNumber(value.width) ||
        !isFiniteNumber(value.height)
      ) {
        return null
      }

      return {
        height: value.height,
        id: value.id,
        type: "resize_node",
        width: value.width,
      }

    case "update_node_data":
      if (typeof value.id !== "string") {
        return null
      }

      return {
        colorIndex: parseOptionalInteger(value.colorIndex),
        id: value.id,
        label: parseOptionalString(value.label),
        shape: parseOptionalShape(value.shape),
        type: "update_node_data",
      }

    case "delete_node":
      if (typeof value.id !== "string") {
        return null
      }

      return {
        id: value.id,
        type: "delete_node",
      }

    case "add_edge":
      if (typeof value.source !== "string" || typeof value.target !== "string") {
        return null
      }

      return {
        id: parseOptionalString(value.id),
        label: parseOptionalString(value.label),
        source: value.source,
        sourceHandle: parseOptionalHandle(value.sourceHandle),
        target: value.target,
        targetHandle: parseOptionalHandle(value.targetHandle),
        type: "add_edge",
      }

    case "delete_edge":
      if (typeof value.id !== "string") {
        return null
      }

      return {
        id: value.id,
        type: "delete_edge",
      }

    default:
      return null
  }
}

function parseOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined
}

function parseOptionalNumber(value: unknown) {
  return isFiniteNumber(value) ? value : undefined
}

function parseOptionalInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? value : undefined
}

function parseOptionalShape(value: unknown) {
  return typeof value === "string" &&
    NODE_SHAPES.some((shape) => shape === value)
    ? (value as CanvasNodeShape)
    : undefined
}

function parseOptionalHandle(value: unknown) {
  return value === "top" ||
    value === "right" ||
    value === "bottom" ||
    value === "left"
    ? (value as CanvasHandlePosition)
    : undefined
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error"
}
